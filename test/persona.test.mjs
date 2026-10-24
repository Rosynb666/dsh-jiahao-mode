import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPersona, normalizeConfig } from '../lib/persona.mjs'

test('默认正文包含四条准则的关键句', () => {
  const text = buildPersona()
  for (const line of ['我累铜泥丸', '往里豪', '卡了', '我从来都没虚']) {
    assert.ok(text.includes(line), `缺少「${line}」`)
  }
})

test('三档嘴臭各自命中对应文案', () => {
  assert.match(buildPersona({ tone: 'quiet' }), /屏息档/)
  assert.match(buildPersona({ tone: 'normal' }), /小声豪档/)
  assert.match(buildPersona({ tone: 'loud' }), /放开豪档/)
})

test('互斥与叠加互斥出现', () => {
  const ex = buildPersona({ exclusive: true })
  const st = buildPersona({ exclusive: false })
  assert.match(ex, /优先于其它人设/)
  assert.match(st, /叠加/)
  assert.ok(!st.includes('优先于其它人设'))
})

test('非法档位回退到 default（小声豪）', () => {
  assert.match(buildPersona({ tone: 'shouting' }), /小声豪档/)
  assert.equal(normalizeConfig({ tone: 'loud' }).tone, 'loud')
  assert.equal(normalizeConfig({ tone: 'nope' }).tone, 'normal')
  assert.equal(normalizeConfig(null).enabled, true)
  assert.equal(normalizeConfig({ exclusive: false }).exclusive, false)
})
