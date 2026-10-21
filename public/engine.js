/** Deterministic rules only: no DOM, storage, clock, random values or natural-language parsing. */
const clone = value => structuredClone(value);
export function createState(definition) {
  return {
    definition: clone(definition), stageId: definition.id,
    reality: clone(definition.reality), robots: clone(definition.robots),
    memories: clone(definition.memories), turn: 0, status: 'playing',
    deliveries: [], log: [], history: []
  };
}
export function belief(state, owner, person) {
  const candidates = state.memories.filter(m => !m.deleted && m.owner === owner && m.facts.some(f => f.person === person));
  const card = candidates.reduce((latest, m) => !latest || m.order > latest.order ? m : latest, null);
  return card ? { room: card.facts.find(f => f.person === person).room, cardId: card.id } : { room: null, cardId: null };
}
function snapshot(state) {
  const { history, ...rest } = state;
  return clone(rest);
}
/** Returns a new state; invalid/terminal commands are explicit no-ops. */
export function transition(state, action) {
  if (action.type === 'restart') return createState(state.definition);
  if (action.type === 'undo') {
    if (!state.history.length) return state;
    return { ...clone(state.history.at(-1)), history: state.history.slice(0, -1) };
  }
  if (state.status !== 'playing') return state;
  if (!['delete', 'execute'].includes(action.type)) return state;
  const selected = state.memories.find(m => m.id === action.id && !m.deleted);
  if (action.type === 'delete' && !selected) return state;
  const next = { ...snapshot(state), history: [...state.history, snapshot(state)] };
  if (action.type === 'delete') {
    next.memories.find(m => m.id === action.id).deleted = true;
    const changes = selected.facts.map(f => ({
      person: f.person, before: belief(state, selected.owner, f.person), after: belief(next, selected.owner, f.person)
    }));
    next.log.push({ kind: 'forget', id: selected.id, robot: selected.owner, changes, turn: state.turn });
    return next;
  }
  // Compute every intention from the same PRE-execution state, then commit them together.
  const intentions = state.robots.map(r => ({ robot: r.id, person: r.queue[r.cursor], belief: belief(state, r.id, r.queue[r.cursor]) }));
  next.turn++;
  for (const intent of intentions) {
    if (!intent.person) continue;
    if (intent.belief.room === null) {
      next.log.push({ kind: 'wait', robot: intent.robot, person: intent.person, turn: next.turn });
      continue;
    }
    const delivery = {
      kind: 'delivery', robot: intent.robot, person: intent.person, room: intent.belief.room,
      cardId: intent.belief.cardId, actual: state.reality[intent.person],
      correct: intent.belief.room === state.reality[intent.person], turn: next.turn
    };
    next.deliveries.push(delivery); next.log.push(delivery);
    next.robots.find(r => r.id === intent.robot).cursor++;
  }
  if (next.deliveries.some(d => !d.correct)) next.status = 'failure';
  else if (next.robots.every(r => r.cursor === r.queue.length)) next.status = 'success';
  return next;
}
