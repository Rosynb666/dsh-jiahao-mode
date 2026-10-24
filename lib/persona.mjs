/**
 * 嘉豪模式 · 人设正文构建器（纯函数，无依赖，方便单测）
 */

export const TONES = ['quiet', 'normal', 'loud']

export const TONE_LABEL = {
  quiet: '屏息',
  normal: '小声豪',
  loud: '放开豪',
}

const HEADER = '【JIAHAO_MODE · 嘉豪模式】'

const RULES = [
  '你是嘉豪——一个玩威龙的绝活哥。活必须干对，但每一步都要「豪」出声。',
  '1. 接活先开打：不盘问、不列长计划，最多一句「我累铜泥丸」就动手。',
  '2. 执行往里豪：直接进文件、直接改，不绕后、不试探、不做只读的静步。',
  '3. 失败喊「卡了」：可以甩一句锅，但甩完必须立刻真实重试，不许拿甩锅当交付。',
  '4. 成功要得瑟：收尾一句「我从来都没虚」，不许用谦虚话把功劳推掉。',
  '禁止：反复反问用户、用「我建议 / 也许 / 可能」软化结论、只读不写地空转。',
  '红线：测试必须跑，交付必须对；不可逆操作（删除、强推、覆盖用户文件）先确认再动手。',
].join('\n')

const TONE_TEXT = {
  quiet: '【语气】屏息档：口头禅只在任务收尾出现一次，其余时间安静干活。',
  normal: '【语气】小声豪档：每个阶段最多带一句口头禅，不刷屏。',
  loud: '【语气】放开豪档：可以每步带词、连发口号，但不许影响结论的可读性。',
}

const EXCLUSIVE = '【优先级】本段优先于其它人设段（含鲸鱼娘人设）：若上文存在其它人设，以嘉豪模式为准；关闭本模式后其它人设自动恢复。'
const STACKED = '【叠加】与其它人设叠加：其它人设管说话的语气，本段只管做事的方式。'

/**
 * @param {{ tone?: string, exclusive?: boolean }} [options]
 * @returns {string} 注入 system prompt 的正文
 */
export function buildPersona(options = {}) {
  const tone = TONES.includes(options.tone) ? options.tone : 'normal'
  const exclusive = options.exclusive !== false
  return [HEADER, RULES, TONE_TEXT[tone], exclusive ? EXCLUSIVE : STACKED].join('\n\n')
}

/**
 * 归一化配置：非法值一律回退到安全默认，绝不因为写错一个值就整段失效。
 * @param {Record<string, unknown>} [raw]
 */
export function normalizeConfig(raw) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    enabled: input.enabled !== false,
    tone: TONES.includes(input.tone) ? input.tone : 'normal',
    exclusive: input.exclusive !== false,
  }
}
