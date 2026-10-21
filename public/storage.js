const KEY = 'oblivion-architect:progress:v1';
const IDS = ['P01', 'P02', 'P03'];
export function freshProgress() { return { version: 1, completed: [], stage: 0, report: null, sound: false }; }
function normalize(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.completed)) return freshProgress();
  const completed = [];
  for (const id of IDS) { if (!value.completed.includes(id)) break; completed.push(id); }
  const maxStage = Math.min(completed.length, 2);
  return {
    version: 1, completed,
    stage: Number.isInteger(value.stage) ? Math.max(0, Math.min(value.stage, maxStage)) : maxStage,
    report: completed.length === 3 && ['public', 'internal'].includes(value.report) ? value.report : null,
    sound: value.sound === true
  };
}
export function readProgress(storage) {
  try {
    const raw = storage.getItem(KEY);
    try { return { progress: normalize(raw ? JSON.parse(raw) : null), available: true }; }
    catch { return { progress: freshProgress(), available: true }; }
  } catch { return { progress: freshProgress(), available: false }; }
}
export function writeProgress(storage, progress) {
  try { storage.setItem(KEY, JSON.stringify(normalize(progress))); return true; }
  catch { return false; }
}
export function completeStage(progress, index) {
  const next = normalize(progress);
  if (!Number.isInteger(index) || index < 0 || index > 2 || index > next.completed.length) return next;
  if (next.completed.includes(IDS[index])) return next;
  next.completed.push(IDS[index]); next.stage = Math.min(index + 1, 2);
  return next;
}
export function chooseReport(progress, choice) {
  const next = normalize(progress);
  if (next.completed.length === 3 && ['public', 'internal'].includes(choice)) next.report = choice;
  return next;
}
