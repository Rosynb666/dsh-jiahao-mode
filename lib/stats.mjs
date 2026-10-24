/**
 * 嘉豪模式 · 战绩与豪气值（纯函数，无依赖，可单测）
 *
 * 输入是 DSH 的 session 事件（tool/call、tool/result、turn/end），
 * 输出是面板 / 播报 / 结算卡要用的状态。读写分离，宿主只负责喂事件。
 */

export const START_HAO = 50
export const MAX_HAO = 100
export const MIN_HAO = 0
export const FEED_LIMIT = 24

/** 只读工具：连续只读不写时扣「静步分」。 */
export const READ_TOOLS = new Set(['read', 'grep', 'glob', 'ls', 'list', 'search', 'web_search', 'web_fetch'])

/** 一次成功的工具调用加多少豪气。 */
const GAIN = 6
/** 一次失败扣多少。 */
const LOSS = 10
/** 连续只读不写，每次再扣。 */
const READ_PENALTY = 3
/** 连续几次只读开始扣分。 */
const READ_THRESHOLD = 3

/**
 * @returns {ReturnType<typeof createStats>}
 */
export function createStats() {
  return {
    hao: START_HAO,
    kills: 0,
    fails: 0,
    streak: 0,
    bestStreak: 0,
    readRun: 0,
    turnKills: 0,
    turnFails: 0,
    turn: 0,
    seq: 0,
    calls: {},
    feed: [],
    lastSettle: null,
  }
}

/**
 * 评级：一局（一次 turn）结束时的结算。
 * @param {{ kills: number, fails: number, hao: number }} settle
 */
export function gradeOf({ kills, fails, hao }) {
  if (fails === 0 && kills >= 3 && hao >= 70) return 'S'
  if (fails === 0 && kills >= 1) return 'A'
  if (fails <= 1) return 'B'
  return 'C'
}

/**
 * 结算文案。
 * @param {string} grade
 */
export function gradeLine(grade) {
  return {
    S: '这波豪到你了。',
    A: '稳中带豪，可以得瑟。',
    B: '卡了一下，但没逃。',
    C: '被爆头了，下一把再来。',
  }[grade] ?? '豪完了。'
}

function pushFeed(stats, item) {
  stats.seq += 1
  stats.feed.push({ id: stats.seq, ...item })
  if (stats.feed.length > FEED_LIMIT) stats.feed = stats.feed.slice(-FEED_LIMIT)
}

function clamp(n) {
  return Math.max(MIN_HAO, Math.min(MAX_HAO, n))
}

/**
 * 消费一条 session 事件，返回是否改动了状态。
 * @param {ReturnType<typeof createStats>} stats
 * @param {{ type?: string, data?: any }} event
 * @returns {boolean}
 */
export function applyEvent(stats, event) {
  const type = event?.type
  const data = event?.data ?? {}

  if (type === 'tool/call') {
    if (typeof data.callId === 'string') stats.calls[data.callId] = String(data.name ?? 'tool')
    return false
  }

  if (type === 'tool/result') {
    const callId = data.message?.toolCallId
      ?? data.message?.content?.find?.((block) => block && typeof block.callId === 'string')?.callId
    const name = (callId && stats.calls[callId]) || '工具'
    if (callId) delete stats.calls[callId]

    const failed = Boolean(data.error) || data.message?.isError === true
    if (failed) {
      stats.fails += 1
      stats.turnFails += 1
      stats.streak = 0
      stats.readRun = 0
      stats.hao = clamp(stats.hao - LOSS)
      pushFeed(stats, { kind: 'fail', tool: name, text: `卡了 · ${name} 没顶住` })
    } else {
      stats.kills += 1
      stats.turnKills += 1
      stats.streak += 1
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak)
      stats.hao = clamp(stats.hao + GAIN)
      if (READ_TOOLS.has(name)) {
        stats.readRun += 1
        if (stats.readRun > READ_THRESHOLD) stats.hao = clamp(stats.hao - READ_PENALTY)
      } else {
        stats.readRun = 0
      }
      pushFeed(stats, {
        kind: 'kill',
        tool: name,
        text: stats.streak >= 3 ? `${stats.streak} 连豪 · ${name} 被豪死了` : `豪死了 ${name}`,
      })
    }
    return true
  }

  if (type === 'turn/end') {
    const settle = {
      turn: Number(data.turn ?? 0) || stats.turn + 1,
      kills: stats.turnKills,
      fails: stats.turnFails,
      hao: stats.hao,
      bestStreak: stats.bestStreak,
      seq: stats.seq + 1,
    }
    settle.grade = gradeOf(settle)
    stats.lastSettle = settle
    stats.turn += 1
    stats.turnKills = 0
    stats.turnFails = 0
    pushFeed(stats, { kind: 'settle', text: `结算 · ${settle.grade} 级`, grade: settle.grade })
    return true
  }

  return false
}

/**
 * 生涯数据：跨会话累计。
 */
export function emptyCareer() {
  return { turns: 0, kills: 0, fails: 0, bestStreak: 0, grades: { S: 0, A: 0, B: 0, C: 0 } }
}

/**
 * 把一局结算并入生涯。
 * @param {ReturnType<typeof emptyCareer>} career
 * @param {{ kills?: number, fails?: number, grade?: string, bestStreak?: number }} settle
 */
export function applyCareer(career, settle) {
  const base = { ...emptyCareer(), ...(career ?? {}) }
  const grades = { ...base.grades }
  const grade = settle?.grade
  if (grade && Object.prototype.hasOwnProperty.call(grades, grade)) grades[grade] += 1
  return {
    turns: base.turns + 1,
    kills: base.kills + (Number(settle?.kills) || 0),
    fails: base.fails + (Number(settle?.fails) || 0),
    bestStreak: Math.max(base.bestStreak, Number(settle?.bestStreak) || 0),
    grades,
  }
}

/** 生涯里最好的一次评级。 */
export function bestGrade(career) {
  const grades = career?.grades ?? {}
  for (const grade of ['S', 'A', 'B', 'C']) {
    if ((grades[grade] ?? 0) > 0) return grade
  }
  return '-'
}

/**
 * 手动喊「卡了」：清连杀与只读计数，不做扣分（扣分交给下一轮真实重试）。
 * @param {ReturnType<typeof createStats>} stats
 */
export function markLagged(stats) {
  stats.streak = 0
  stats.readRun = 0
}

/**
 * 给客户端的面板快照（裁掉调用表与完整 feed）。
 * @param {ReturnType<typeof createStats>} stats
 */
export function snapshot(stats) {
  return {
    hao: stats.hao,
    kills: stats.kills,
    fails: stats.fails,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    turn: stats.turn,
    seq: stats.seq,
    feed: stats.feed.slice(-8),
    lastSettle: stats.lastSettle,
  }
}
