/**
 * 嘉豪模式 · Host half
 *
 * 只做一件事：把「嘉豪模式」的人设段注册进 system prompt。
 * 段文本由 lib/persona.mjs 构建（纯函数），开关 / 档位 / 互斥都走 volatile 配置，
 * 改动即时生效，不需要重启插件。
 *
 * 设计上的三条纪律：
 *   · 只注册一个独立段名 `jiahao:mode`，不碰 registry 自身的槽位；
 *   · `interpolate: false`——人设是纯文本，不做变量替换；
 *   · 关掉开关就卸载段落，关掉后不留残余。
 */
import z from '@deepseek-ai/schemastery'
import { buildPersona, normalizeConfig, TONES } from './persona.mjs'

/** Cordis 插件名；同时是 cordis.patch.yml 里那一行的 `name`。 */
export const name = 'dsh-jiahao-mode'

/** 本插件向提示词注册表贡献段落，因此依赖 `systemPrompt` 服务。 */
export const inject = ['systemPrompt']

/** 段名；同时是本插件的配置命名空间。 */
const SECTION = 'jiahao:mode'

/** 排序：排在部署人设前缀与其它人设之后。 */
const ORDER = 30

/**
 * 配置。三个字段都是 volatile：设置表单改完即时生效。
 * 全部带默认值并整体 `.default({})`——profile 补丁行没写 `config:` 时会传 undefined。
 */
export const Config = z
  .object({
    enabled: z.boolean().default(true).volatile().description('总开关：关掉后不注入任何人设'),
    tone: z.string().default('normal').volatile().description('嘴臭档位：quiet / normal / loud'),
    exclusive: z.boolean().default(true).volatile().description('与其它人设互斥（含鲸鱼娘人设）'),
  })
  .default({})

/**
 * 读取 volatile 字段的当前值；普通值也能读。
 * @param {unknown} field
 */
function liveValue(field) {
  if (field !== null && typeof field === 'object' && typeof field.get === 'function') return field.get()
  return field
}

/**
 * 把 volatile 配置读成纯对象。
 * @param {Record<string, unknown>} config
 */
function snapshot(config) {
  return normalizeConfig({
    enabled: liveValue(config?.enabled),
    tone: liveValue(config?.tone),
    exclusive: liveValue(config?.exclusive),
  })
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} config
 */
export function apply(ctx, config) {
  /** 当前人设段的 disposer；null 表示未注册。 */
  let section = null

  const sync = () => {
    if (section !== null) {
      section()
      section = null
    }
    const current = snapshot(config)
    if (!current.enabled) return
    section = ctx.systemPrompt.section({
      name: SECTION,
      order: ORDER,
      interpolate: false,
      text: () => buildPersona(snapshot(config)),
    })
  }

  sync()

  // volatile 字段被 Loader 提交后广播该事件；段落必须重新同步。
  ctx.on('loader/volatile-update', sync)

  ctx.effect(
    () => () => {
      if (section === null) return
      section()
      section = null
    },
    'dsh-jiahao-mode: persona section',
  )
}

export { buildPersona, normalizeConfig, TONES }
