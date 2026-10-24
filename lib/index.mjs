/**
 * 嘉豪模式 · Host half
 *
 * 两件事：
 *   1. 把「嘉豪模式」人设段注册进 system prompt（开关 / 档位 / 互斥都是 volatile 配置）；
 *   2. 订阅 session 事件，累计豪气值与战绩，通过 `/jiahao/api/` 给客户端读。
 *
 * 纪律：只注册独立段名 `jiahao:mode`，不碰 registry 槽位；关掉开关就卸载段落；
 * 事件处理永远不抛错，接口坏了也只是面板不更新，不影响会话。
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import z from '@deepseek-ai/schemastery'
import { buildPersona, normalizeConfig, TONES } from './persona.mjs'
import { applyCareer, applyEvent, bestGrade, createStats, emptyCareer, markLagged, snapshot } from './stats.mjs'

/** Cordis 插件名；同时是 cordis.patch.yml 里那一行的 `name`。 */
export const name = 'dsh-jiahao-mode'

/** 依赖提示词注册表与 web 服务。 */
export const inject = ['systemPrompt', 'webServer', 'commands']

const SECTION = 'jiahao:mode'
const ORDER = 30
const API_MOUNT = '/jiahao/api'
const BOOT_LOG = path.join(os.homedir(), '.dsh', 'jiahao-mode.boot.log')
const CAREER_PATH = path.join(os.homedir(), '.dsh', 'jiahao-mode', 'career.json')

function loadCareer() {
  try {
    const raw = JSON.parse(fs.readFileSync(CAREER_PATH, 'utf8'))
    return { ...emptyCareer(), ...raw, grades: { ...emptyCareer().grades, ...(raw.grades ?? {}) } }
  } catch {
    return emptyCareer()
  }
}

function saveCareer(career) {
  try {
    fs.mkdirSync(path.dirname(CAREER_PATH), { recursive: true })
    fs.writeFileSync(CAREER_PATH, JSON.stringify(career, null, 2))
  } catch (error) {
    bootLog(`career save failed: ${String(error)}`)
  }
}

/** 启动诊断：只写本地文件，失败静默。 */
function bootLog(message) {
  try {
    fs.appendFileSync(BOOT_LOG, `[${new Date().toISOString()}] ${message}\n`)
  } catch {
    /* 诊断不能影响加载 */
  }
}

export const Config = z
  .object({
    enabled: z.boolean().default(true).volatile().description('总开关：关掉后不注入任何人设'),
    tone: z.string().default('normal').volatile().description('嘴臭档位：quiet / normal / loud'),
    exclusive: z.boolean().default(true).volatile().description('与其它人设互斥（含鲸鱼娘人设）'),
  })
  .default({})

function liveValue(field) {
  if (field !== null && typeof field === 'object' && typeof field.get === 'function') return field.get()
  return field
}

function snapshotConfig(config) {
  return normalizeConfig({
    enabled: liveValue(config?.enabled),
    tone: liveValue(config?.tone),
    exclusive: liveValue(config?.exclusive),
  })
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/**
 * 把档位写回 volatile 配置；写不进去就退化成会话内覆盖。
 * @param {Record<string, unknown>} config
 * @param {string} tone
 * @returns {boolean}
 */
function writeTone(config, tone) {
  const field = config?.tone
  if (field === null || typeof field !== 'object') return false
  const symbol = Object.getOwnPropertySymbols(field).find((item) => String(item).includes('volatile.write'))
  if (symbol === undefined || typeof field[symbol] !== 'function') return false
  try {
    field[symbol](tone)
    return true
  } catch {
    return false
  }
}

function readJsonBody(req, limit = 2048) {
  return new Promise((resolve) => {
    let body = ''
    let done = false
    req.on('data', (chunk) => {
      if (done) return
      body += chunk
      if (body.length > limit) {
        done = true
        resolve(null)
      }
    })
    req.on('end', () => { if (!done) resolve(body) })
    req.on('error', () => resolve(null))
  })
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} config
 */
export function apply(ctx, config) {
  bootLog(`apply start v${'0.3.1'} (inject: ${(inject || []).join(',')})`)
  /** 当前人设段的 disposer；null 表示未注册。 */
  let section = null

  const sync = () => {
    if (section !== null) {
      section()
      section = null
    }
    if (!snapshotConfig(config).enabled) return
    section = ctx.systemPrompt.section({
      name: SECTION,
      order: ORDER,
      interpolate: false,
      text: () => buildPersona(snapshotConfig(config)),
    })
  }

  sync()
  bootLog(`persona ${section === null ? 'skipped' : 'section registered'}`)
  ctx.on('loader/volatile-update', sync)
  ctx.effect(
    () => () => {
      if (section === null) return
      section()
      section = null
    },
    'dsh-jiahao-mode: persona section',
  )

  /* ---------------------------------------------------------------- 战绩 */

  /** @type {Map<string, ReturnType<typeof createStats>>} */
  const sessions = new Map()
  let career = loadCareer()
  /** @type {string | null} */
  let lastActive = null

  const statsOf = (id) => {
    let stats = sessions.get(id)
    if (stats === undefined) {
      stats = createStats()
      sessions.set(id, stats)
      if (sessions.size > 32) {
        const first = sessions.keys().next().value
        if (first !== undefined && first !== id) sessions.delete(first)
      }
    }
    return stats
  }

  ctx.on('session/event', (session, event) => {
    try {
      const id = typeof session?.id === 'string' ? session.id : 'default'
      const stats = statsOf(id)
      lastActive = id
      const changed = applyEvent(stats, event)
      if (changed && event?.type === 'turn/end' && stats.lastSettle !== null) {
        career = applyCareer(career, stats.lastSettle)
        saveCareer(career)
      }
    } catch {
      /* 统计永远不拖垮会话 */
    }
  })

  /* ---------------------------------------------------------------- 命令 */

  const currentStats = () => (lastActive === null ? undefined : sessions.get(lastActive))

  const injectText = (agent, text) => {
    if (agent === null || typeof agent !== 'object' || typeof agent.inject !== 'function') {
      throw new Error('当前没有可用的 agent')
    }
    agent.inject({
      id: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text }],
      source: { kind: 'plugin', plugin: 'dsh-jiahao-mode', form: 'instructions' },
    })
  }

  ctx.effect(() => {
    const disposers = []
    const register = (definition) => {
      try {
        disposers.push(ctx.commands.register(definition))
        bootLog(`command /${definition.name} registered`)
      } catch (error) {
        bootLog(`command /${definition.name} failed: ${String(error)}`)
      }
    }

    register({
      definitionId: 'dsh-jiahao-mode:advance',
      name: 'advance',
      description: '往里豪：跳过调研直接改（可带步数，默认 3）',
      handler: async (invocation) => {
        const steps = Math.min(10, Math.max(1, Number.parseInt(String(invocation.rawInput ?? '').trim(), 10) || 3))
        try {
          injectText(invocation.agent, `往里豪（推进 ${steps} 步）：跳过调研，直接进文件改；${steps} 步内给出能跑的结果，别只读不写。`)
          return { kind: 'success', text: `推进 ${steps} 步，豪进去了。` }
        } catch (error) {
          return { kind: 'error', text: `推进失败：${String(error?.message ?? error)}` }
        }
      },
    })

    register({
      definitionId: 'dsh-jiahao-mode:lagged',
      name: 'lagged',
      description: '卡了：清掉连杀，命令当前回合立刻真实重试',
      handler: async (invocation) => {
        const stats = currentStats()
        if (stats !== undefined) markLagged(stats)
        try {
          injectText(invocation.agent, '卡了——立刻真实重试，不许解释、不许换目标、不许拿甩锅当交付。')
          return { kind: 'success', text: '卡了，但没逃；重试指令已经塞进去了。' }
        } catch (error) {
          return { kind: 'error', text: `没塞进去：${String(error?.message ?? error)}` }
        }
      },
    })

    register({
      definitionId: 'dsh-jiahao-mode:niwan',
      name: 'niwan',
      description: '铜泥丸：报出当前豪气值与战绩',
      handler: async () => {
        const stats = currentStats()
        if (stats === undefined) return { kind: 'success', text: '我累铜泥丸——还没开打，先来一单。' }
        return {
          kind: 'success',
          text: `我累铜泥丸：豪气 ${stats.hao} · 击杀 ${stats.kills} · 卡了 ${stats.fails} · 连杀 ${stats.streak} · 最佳 ${stats.bestStreak}`,
        }
      },
    })

    register({
      definitionId: 'dsh-jiahao-mode:career',
      name: 'career',
      description: '战绩：查看跨会话生涯数据',
      handler: async () => ({
        kind: 'success',
        text: `生涯：${career.turns} 回合 · ${career.kills} 击杀 · ${career.fails} 卡了 · 最佳连杀 ${career.bestStreak} · 最好评级 ${bestGrade(career)}`,
      }),
    })

    return () => {
      for (const dispose of disposers) {
        try { dispose() } catch { /* 卸载失败不冒泡 */ }
      }
    }
  }, 'dsh-jiahao-mode: commands')

  ctx.effect(() => {
    let dispose
    try {
      dispose = ctx.webServer.register({
      kind: 'prefix',
      path: API_MOUNT,
      handler: async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://127.0.0.1')
          const stats = lastActive === null ? undefined : sessions.get(lastActive)

          if (url.pathname === `${API_MOUNT}/tone` && req.method === 'POST') {
            const body = await readJsonBody(req)
            let tone = ''
            try { tone = String(JSON.parse(body ?? '{}').tone ?? '') } catch { tone = '' }
            if (!TONES.includes(tone)) {
              sendJson(res, { ok: false, error: 'bad-tone' }, 400)
              return
            }
            const written = writeTone(config, tone)
            sendJson(res, { ok: true, tone: snapshotConfig(config).tone, written })
            return
          }

          if (url.pathname === `${API_MOUNT}/state`) {
            if (stats === undefined) {
              sendJson(res, { ok: true, tone: snapshotConfig(config).tone, career, state: null })
              return
            }
            sendJson(res, {
              ok: true,
              session: lastActive,
              tone: snapshotConfig(config).tone,
              career,
              state: snapshot(stats),
            })
            return
          }

          if (url.pathname === `${API_MOUNT}/feed`) {
            const since = Number(url.searchParams.get('since') ?? 0) || 0
            const items = stats === undefined ? [] : stats.feed.filter((item) => item.id > since)
            sendJson(res, { ok: true, items })
            return
          }

          sendJson(res, { ok: false, error: 'not-found' }, 404)
        } catch {
          sendJson(res, { ok: false, error: 'internal' }, 500)
        }
      },
    })
      bootLog('routes registered at /jiahao/api')
    } catch (error) {
      bootLog(`route register failed: ${String(error)}`)
      return () => {}
    }
    return dispose
  }, 'dsh-jiahao-mode: /jiahao/api routes')
}

export { buildPersona, normalizeConfig, TONES }
