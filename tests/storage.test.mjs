import test from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, readProgress, writeProgress, completeStage, chooseReport } from '../public/storage.js';
const store = initial => { let value = initial; return { getItem: () => value, setItem: (key, v) => { value = v; } }; };

test('empty and corrupt saves become fresh progress', () => {
  for (const v of [null, '{invalid', 'null', '[]', '{"version":99}']) assert.deepEqual(readProgress(store(v)).progress, freshProgress());
});
test('missing storage does not prevent play', () => {
  const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.equal(readProgress(blocked).available, false);
  assert.equal(writeProgress(blocked, freshProgress()), false);
});
test('complete stage unlocks only the next stage and does not mutate input', () => {
  const p = freshProgress(), next = completeStage(p, 0);
  assert.deepEqual(p.completed, []); assert.deepEqual(next.completed, ['P01']); assert.equal(next.stage, 1);
  assert.deepEqual(completeStage(p, 2), p);
});
test('round trip retains completed rooms, next room and report', () => {
  let p = freshProgress(); for (let i = 0; i < 3; i++) p = completeStage(p, i);
  p = chooseReport(p, 'public'); const s = store(null);
  assert.equal(writeProgress(s, p), true); assert.deepEqual(readProgress(s).progress, p);
  assert.equal(chooseReport(p, 'internal').report, 'internal');
});
test('unearned endings, bad indices and invalid choices cannot unlock rooms', () => {
  const p = readProgress(store(JSON.stringify({ version: 1, stage: 42, completed: ['P03'], report: 'public' }))).progress;
  assert.deepEqual(p, freshProgress());
  assert.equal(chooseReport(freshProgress(), 'public').report, null);
});
test('duplicate completion is idempotent', () => {
  const p = completeStage(freshProgress(), 0); assert.deepEqual(completeStage(p, 0), p);
});
