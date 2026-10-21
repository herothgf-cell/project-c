import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../public/engine.js';
import { STAGES } from '../public/content.js';
const del = (s, id) => engine.transition(s, { type: 'delete', id });
const run = s => engine.transition(s, { type: 'execute' });
const undo = s => engine.transition(s, { type: 'undo' });
const reset = s => engine.transition(s, { type: 'restart' });
const state = i => engine.createState(STAGES[i]);
const solve2 = () => run(del(run(del(state(1), 'A-13')), 'A-12'));

test('T01 deleting latest memory reveals the older fact without advancing time', () => {
  const s = del(state(0), 'A-02');
  assert.deepEqual(engine.belief(s, 'A', 'mina'), { room: 'W', cardId: 'A-01' });
  assert.equal(s.turn, 0); assert.equal(s.deliveries.length, 0);
});
test('T02 all related memories deleted yields Unknown and waits without skipping', () => {
  const s = run(del(del(state(0), 'A-01'), 'A-02'));
  assert.equal(engine.belief(s, 'A', 'mina').room, null);
  assert.equal(s.status, 'playing'); assert.equal(s.robots[0].cursor, 0);
  assert.equal(s.log.at(-1).kind, 'wait');
});
test('T03 deleting older fact leaves wrong destination and fails', () => {
  const s = run(del(state(0), 'A-01'));
  assert.equal(s.status, 'failure'); assert.equal(s.deliveries[0].room, 'E');
});
test('P01 intended solution wins', () => assert.equal(run(del(state(0), 'A-02')).status, 'success'));
test('T04 P02 requires use then forgetting of the mixed episode', () => {
  const s = solve2();
  assert.equal(s.status, 'success');
  assert.deepEqual(s.deliveries.map(d => [d.person, d.room]), [['mina', 'W'], ['jun', 'E']]);
  assert.equal(engine.belief(s, 'A', 'mina').room, null);
});
test('T05 deleting mixed episode early loses required first address', () => {
  const s = run(del(del(state(1), 'A-13'), 'A-12'));
  assert.equal(s.robots[0].cursor, 0); assert.equal(s.deliveries.length, 0);
});
test('T06 keeping the mixed episode misdelivers second letter', () => {
  const s = run(run(del(state(1), 'A-13')));
  assert.equal(s.status, 'failure'); assert.equal(s.deliveries[1].room, 'N');
});
test('T07 changing source robot leaves recipient memory intact', () => {
  const s = del(state(2), 'A-22');
  assert.equal(engine.belief(s, 'B', 'mina').cardId, 'B-22');
  const next = run(s);
  assert.equal(next.status, 'failure'); assert.equal(next.deliveries.length, 2);
  assert.deepEqual(next.deliveries.map(d => d.correct), [true, false]);
});
test('T08 both owners must forget their separate latest episode', () => {
  const s = run(del(del(state(2), 'A-22'), 'B-22'));
  assert.equal(s.status, 'success'); assert.equal(s.turn, 1);
});
test('T09 source correct and recipient Unknown is pending, not success', () => {
  let s = state(2); for (const id of ['A-22', 'B-21', 'B-22']) s = del(s, id);
  s = run(s); assert.equal(s.status, 'playing'); assert.equal(s.deliveries.length, 1);
  assert.equal(s.robots[1].cursor, 0);
});
test('T10 undo restores world, logs, cards, cursor and turn, including failure/success', () => {
  const initial = state(1), removed = del(initial, 'A-13'), sent = run(removed);
  assert.deepEqual(undo(sent), removed); assert.deepEqual(undo(undo(sent)), initial);
  const beforeFailure = run(del(state(1), 'A-13'));
  assert.deepEqual(undo(run(beforeFailure)), beforeFailure);
  const beforeSuccess = del(state(0), 'A-02');
  assert.deepEqual(undo(run(beforeSuccess)), beforeSuccess);
});
test('T11 restart returns a clean independent room', () => {
  assert.deepEqual(reset(solve2()), state(1));
  assert.equal(state(2).history.length, 0);
});
test('T14 deterministic and never mutates caller data or stage content', () => {
  const s = state(2), copy = structuredClone(s), config = structuredClone(STAGES);
  assert.deepEqual(run(s), run(s)); assert.deepEqual(s, copy); assert.deepEqual(STAGES, config);
});
test('per-person latest acquisition order, not array layout', () => {
  let s = state(1); s.memories.reverse();
  assert.equal(engine.belief(s, 'A', 'jun').cardId, 'A-12');
  assert.equal(engine.belief(s, 'A', 'mina').cardId, 'A-13');
});
test('deleting an episode removes every fact in that episode', () => {
  const s = del(del(state(1), 'A-13'), 'A-12');
  assert.equal(engine.belief(s, 'A', 'mina').room, null);
  assert.equal(engine.belief(s, 'A', 'jun').room, 'E');
});
test('duplicate deletion, unknown card and actions after terminal state are no-ops', () => {
  const s = del(state(0), 'A-02');
  assert.deepEqual(del(s, 'A-02'), s); assert.deepEqual(del(s, 'missing'), s);
  const won = run(s); assert.deepEqual(run(won), won); assert.deepEqual(del(won, 'A-01'), won);
  assert.deepEqual(undo(state(0)), state(0));
});
test('completed robot never sends the same item twice while another is waiting', () => {
  let s = state(2); for (const id of ['A-22', 'B-21', 'B-22']) s = del(s, id);
  s = run(run(s)); assert.equal(s.deliveries.length, 1); assert.equal(s.status, 'playing');
});
test('P02 no initial delete subset solves the whole room without interleaved deletion', () => {
  const ids = ['A-11', 'A-12', 'A-13'];
  for (let mask = 0; mask < 8; mask++) {
    let s = state(1); ids.forEach((id, i) => { if (mask & (1 << i)) s = del(s, id); });
    s = run(run(s)); assert.notEqual(s.status, 'success', `subset ${mask}`);
  }
});
