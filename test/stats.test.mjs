import test from 'node:test'
import assert from 'node:assert/strict'
import { applyEvent, createStats, gradeOf, snapshot, START_HAO } from '../lib/stats.mjs'

const call = (callId, name) => ({ type: 'tool/call', data: { callId, name, arguments: {} } })
const result = (callId, isError = false) => ({
  type: 'tool/result',
  data: { message: { content: [{ type: 'tool-result', callId }], isError }, ...(isError ? { error: { message: 'boom' } } : {}) },
})

test('成功调用：豪气 +6、击杀 +1、播报一条', () => {
  const s = createStats()
  applyEvent(s, call('c1', 'bash'))
  assert.equal(applyEvent(s, result('c1')), true)
  assert.equal(s.hao, START_HAO + 6)
  assert.equal(s.kills, 1)
  assert.equal(s.streak, 1)
  assert.equal(s.feed.at(-1).kind, 'kill')
  assert.match(s.feed.at(-1).text, /bash/)
})

test('失败调用：豪气 -10、连杀清零、卡了播报', () => {
  const s = createStats()
  applyEvent(s, call('c1', 'bash'))
  applyEvent(s, result('c1'))
  applyEvent(s, call('c2', 'bash'))
  applyEvent(s, result('c2', true))
  assert.equal(s.fails, 1)
  assert.equal(s.streak, 0)
  assert.equal(s.hao, START_HAO + 6 - 10)
  assert.equal(s.feed.at(-1).kind, 'fail')
})

test('连续只读：超过阈值再扣静步分', () => {
  const s = createStats()
  for (let i = 0; i < 4; i++) {
    applyEvent(s, call(`r${i}`, 'read'))
    applyEvent(s, result(`r${i}`))
  }
  // 4 次成功 +24，第 4 次触发静步 -3
  assert.equal(s.readRun, 4)
  assert.equal(s.hao, START_HAO + 6 * 4 - 3)
})

test('回合结束：产出结算并清零回合计数', () => {
  const s = createStats()
  for (let i = 0; i < 3; i++) {
    applyEvent(s, call(`k${i}`, 'edit'))
    applyEvent(s, result(`k${i}`))
  }
  applyEvent(s, { type: 'turn/end', data: { turn: 1 } })
  const settle = s.lastSettle
  assert.equal(settle.kills, 3)
  assert.equal(settle.fails, 0)
  assert.equal(settle.grade, 'A')
  assert.equal(s.turnKills, 0)
})

test('评级规则', () => {
  assert.equal(gradeOf({ kills: 3, fails: 0, hao: 80 }), 'S')
  assert.equal(gradeOf({ kills: 1, fails: 0, hao: 40 }), 'A')
  assert.equal(gradeOf({ kills: 0, fails: 1, hao: 40 }), 'B')
  assert.equal(gradeOf({ kills: 0, fails: 2, hao: 10 }), 'C')
})

test('快照只带最后 8 条播报', () => {
  const s = createStats()
  for (let i = 0; i < 12; i++) {
    applyEvent(s, call(`x${i}`, 'edit'))
    applyEvent(s, result(`x${i}`))
  }
  const snap = snapshot(s)
  assert.equal(snap.feed.length, 8)
  assert.equal(snap.kills, 12)
  assert.ok(snap.seq >= 12)
})
