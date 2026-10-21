import { STAGES, PEOPLE, ROOMS, ENDINGS } from './content.js';
import { createState, belief, transition } from './engine.js';
import { freshProgress, readProgress, writeProgress, completeStage, chooseReport } from './storage.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = readProgress(storage);
let progress = loaded.progress, storageAvailable = loaded.available;
let screen = 'home', stageIndex = progress.stage, state = createState(STAGES[stageIndex]);
let owner = 'A', selected = null, hintVisible = false, notice = '';
let audio;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const roomName = room => room ? `${ROOMS[room]} 방` : '모름';
const button = (action, label, cls = '', disabled = false) => `<button class="${cls}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const mark = '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
function persist() { storageAvailable = writeProgress(storage, progress); }
function sound(type) {
  if (!progress.sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
    osc.type = 'sine'; osc.frequency.setValueAtTime(type === 'forget' ? 350 : type === 'failure' ? 150 : 580, t);
    gain.gain.setValueAtTime(0.07, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain); gain.connect(audio.destination); osc.start(t); osc.stop(t + 0.18);
  } catch { /* Audio is optional; a blocked audio device must not block the game. */ }
}
function header() {
  return `<header class="site-header"><button class="brand" data-action="home" aria-label="망각 설계자 시작 화면">${mark}<span>망각 설계자<small>THE ARCHIVE AT MIDNIGHT</small></span></button><div class="header-actions"><span class="build-tag">PLAYABLE PROTOTYPE <b>01</b></span>${button('sound', progress.sound ? '소리 켜짐' : '소리 꺼짐', 'quiet')}${button('help', '? <span>규칙</span>', 'quiet')}</div></header>`;
}
function footer() {
  return `<footer class="site-footer"><span>잔향구 기록소 · 야간 정정실</span><span>${storageAvailable ? '완료한 방과 최종 보고가 이 기기에 저장됩니다.' : '이 환경에서는 저장할 수 없습니다. 현재 게임은 계속할 수 있습니다.'}</span><span>v0.1.0 · 기획 v0.3 기반</span></footer>`;
}
function home() {
  const hasSave = progress.completed.length > 0;
  return `<main id="main" class="home-page"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> 기록소의 마지막 밤</p><h1>망각 설계자</h1><h2>어떤 과거를<br><em>남기시겠습니까.</em></h2><p class="hero-description">기억을 고쳐 쓸 수는 없습니다.<br>하지만 지울 수는 있죠.<br>남은 기억이 바꾸는 행동을 설계하세요.</p><div class="hero-buttons">${hasSave ? button('continue', progress.report ? '마지막 기록 보기 <span>↗</span>' : '이어서 정정하기 <span>→</span>', 'primary large') : ''}${button('start', hasSave ? '처음부터' : '정정 업무 시작 <span>→</span>', hasSave ? 'secondary large' : 'primary large')}</div><p class="micro">시간제한 없음 · 언제든 되돌리기 · 3개의 짧은 기록</p></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="archive-stamp">RECORD<br><b>03</b><br>MEMORY / FACT</div><div class="floating-card back-card"><span>이전 기록 / 01</span><p>민아가 서쪽 방에 들어갔다.</p><small>남겨진 과거</small></div><div class="floating-card front-card"><span>가장 최근 기록 / 02</span><p>민아가 동쪽 방에 들어갔다.</p><div class="erased-line"></div><small>기억은 지워도, 과거는 남는다.</small></div><div class="art-caption"><span>기억</span><i>→</i><span>판단</span><i>→</i><span>행동</span></div></div></main><section class="home-bottom" aria-label="기록 목록">${STAGES.map((s, i) => `<div><span class="record-number">0${i + 1}</span><p>${s.title}<small>${['오래된 근거를 발견하다', '필요한 순간까지 남기다', '다른 이의 기억을 마주하다'][i]}</small></p><b>${progress.completed.includes(s.id) ? '완료 ✓' : 'RECORD'}</b></div>`).join('')}</section>`;
}
function board() {
  return `<section class="world-panel" aria-label="실제 세계"><div class="panel-top"><span class="eyebrow">01 / 관제 화면</span><span class="tag">실제 현재 위치</span></div><div class="world-scene"><div class="room-row">${['W', 'N', 'E'].map(r => {
    const residents = Object.keys(state.reality).filter(p => state.reality[p] === r);
    const arrivals = state.deliveries.filter(d => d.room === r);
    return `<div class="room room-${r} ${arrivals.length ? 'has-mail' : ''}"><div class="room-title">${ROOMS[r]}<small>${r === 'W' ? 'WEST' : r === 'N' ? 'NORTH' : 'EAST'}</small></div><div class="room-interior">${residents.length ? residents.map(p => `<div class="person person-${p}"><div class="person-head"></div><div class="person-body"></div><span>${PEOPLE[p]}</span></div>`).join('') : '<div class="empty-room">현재 비어 있음</div>'}</div><div class="mail-slot"><i></i>${arrivals.length ? `<span class="mail-arrival ${arrivals.some(d => !d.correct) ? 'bad' : ''}">${arrivals.every(d => d.correct) ? '✓' : '!'} ${arrivals.length}통 도착</span>` : '<span>불투명 배송구</span>'}</div></div>`;
  }).join('')}</div><div class="pipe-network" aria-hidden="true"><i></i><i></i><i></i></div><div class="robot-row">${state.robots.map(r => {
    const person = r.queue[r.cursor], b = person ? belief(state, r.id, person) : null;
    return `<button class="robot-unit ${owner === r.id ? 'active' : ''}" data-robot="${r.id}" aria-pressed="${owner === r.id}" aria-label="로봇 ${r.id} 선택"><span class="robot-icon"><i></i><i></i></span><span><strong>로봇 ${r.id}</strong><small>${person ? `${PEOPLE[person]} → ${roomName(b.room)}` : '배송 완료 ✓'}</small></span><span class="robot-select-indicator">${owner === r.id ? '선택 중' : '살펴보기'}</span></button>`;
  }).join('')}</div></div><p class="world-note"><span>ⓘ</span> 당신은 현재 위치를 봅니다. 로봇은 배송구 너머를 보지 못하고, 기억에 따라 보냅니다.</p></section>`;
}
function memories() {
  const r = state.robots.find(r => r.id === owner), person = r.queue[r.cursor];
  const b = person ? belief(state, owner, person) : null;
  const card = state.memories.find(m => m.id === selected && !m.deleted && m.owner === owner);
  const preview = card ? transition(state, { type: 'delete', id: card.id }) : null;
  const changes = card ? card.facts.map(f => `${PEOPLE[f.person]}: ${roomName(belief(state, owner, f.person).room)} → ${roomName(belief(preview, owner, f.person).room)}`) : [];
  return `<section class="memory-panel" aria-label="기억 편집"><div class="panel-top"><span class="eyebrow">02 / 기억 열람</span><span class="tag">소유자 ${owner}</span></div><div class="memory-heading"><h3>로봇 ${owner}의 기억</h3><div class="owner-switch" aria-label="기억 소유자 선택">${state.robots.map(a => `<button data-robot="${a.id}" aria-pressed="${a.id === owner}" class="${a.id === owner ? 'active' : ''}" aria-label="${a.id}의 기억 보기">${a.id}</button>`).join('')}</div></div><div class="belief-box"><span>${person ? `다음 수신자 · ${PEOPLE[person]}` : '목적 달성'}</span><strong>${b ? `${PEOPLE[person]}는 <em>${roomName(b.room)}</em>${b.room ? '에 있다' : ''}` : '모든 편지를 보냈습니다'}</strong><small>${b ? b.cardId ? `판단 근거 ${b.cardId} · 가장 최근에 얻은 관련 기억` : '남은 위치 기억이 없어 대기합니다.' : '완료된 배송은 기억을 지워도 남습니다.'}</small></div><div class="cards-instruction"><span>장면을 선택하고, 통째로 지웁니다.</span><span>과거 ↓ 최근</span></div><div class="memory-list">${state.memories.filter(m => m.owner === owner).sort((a, b) => a.order - b.order).map(m => `<button class="memory-card ${m.deleted ? 'deleted' : ''} ${selected === m.id ? 'selected' : ''} ${b?.cardId === m.id ? 'basis' : ''}" data-card="${m.id}" aria-pressed="${selected === m.id}" ${m.deleted || state.status !== 'playing' ? 'disabled' : ''}><span class="card-meta"><span><b>${String(m.order).padStart(2, '0')}</b> ${esc(m.source)}</span><span>${m.deleted ? '지운 기억' : b?.cardId === m.id ? '현재 판단 근거' : m.id}</span></span><span class="card-text">${esc(m.text)}</span><span class="fact-chips">${m.facts.map(f => `<span>${PEOPLE[f.person]} · ${ROOMS[f.room]}</span>`).join('')}<span class="card-select-mark" aria-hidden="true">${m.deleted ? '−' : selected === m.id ? '✓' : '+'}</span></span></button>`).join('')}</div><div class="forget-preview"><small>${card ? '이 장면을 지우면 · 실행 전 판단 변화' : '삭제할 장면을 선택해 주세요.'}</small><p>${changes.length ? changes.map(esc).join('<br>') : '삭제만으로 배송이 진행되지는 않습니다.'}</p></div>${button('forget', '선택한 장면 지우기 <span>⌫</span>', 'forget-button', !card || state.status !== 'playing')}</section>`;
}
function logText(entry) {
  if (entry.kind === 'forget') return `${entry.robot}의 ${entry.id} 삭제 · ` + entry.changes.map(c => `${PEOPLE[c.person]} ${roomName(c.before.room)} → ${roomName(c.after.room)}`).join(' / ');
  if (entry.kind === 'wait') return `${entry.robot}: ${PEOPLE[entry.person]}의 위치를 몰라 대기합니다. 배송 순서를 건너뛰지 않습니다.`;
  return `${entry.robot}: ${entry.cardId}을 근거로 ${PEOPLE[entry.person]}에게 ${roomName(entry.room)} 발송 · ${entry.correct ? '전달 완료' : `오배송 (실제 ${roomName(entry.actual)})`}`;
}
function result() {
  if (state.status === 'playing') return '';
  const win = state.status === 'success';
  return `<section class="result-banner ${win ? 'win' : 'loss'}" data-status="${state.status}" role="status"><span class="result-icon">${win ? '✓' : '!'}</span><div><span class="eyebrow">${win ? '기록 정정 완료' : '오배송 발생'}</span><h3>${win ? '편지가 제자리에 도착했습니다.' : '기억과 현실이 어긋났습니다.'}</h3><p>${win ? STAGES[stageIndex].lesson : '아래 실행 기록에서 원인을 확인하세요. 되돌리기로 배송 이전 상태를 복원할 수 있습니다.'}</p></div>${win ? button('next', stageIndex < 2 ? '다음 기록 →' : '최종 보고 →', 'primary') : '<span class="retry-note">아래의 되돌리기로 다시 시도하세요.</span>'}</section>`;
}
function game() {
  const s = STAGES[stageIndex];
  const delivered = state.deliveries.filter(d => d.correct).length, total = state.robots.reduce((n, r) => n + r.queue.length, 0);
  return `<main id="main" class="game-page" data-stage="${s.id}"><nav class="chapter-nav" aria-label="기록 진행">${STAGES.map((st, i) => `<button class="chapter ${i === stageIndex ? 'current' : ''}" data-stage-index="${i}" ${i > progress.completed.length ? 'disabled' : ''} ${i === stageIndex ? 'aria-current="step"' : ''}><span>${progress.completed.includes(st.id) ? '✓' : `0${i + 1}`}</span>${st.title}</button>`).join('')}<span class="paused"><i></i> 관찰 중 · 시간 정지</span></nav><div class="stage-heading"><div><p class="eyebrow">${s.chapter} / ${s.id}</p><h2>${s.title}</h2><p>${s.intro}</p></div><div class="delivery-counter"><span>전달 완료</span><strong data-testid="delivery-count">${delivered} / ${total}</strong></div></div><div class="objective"><span class="objective-label">이번 목표</span><strong>${s.goal}</strong><span class="objective-rule">한 통이라도 오배송하면 실패</span></div>${result()}<div class="game-grid"><div class="world-column">${board()}<section class="log-panel" aria-label="행동 기록"><div class="panel-top"><h3>정정 기록</h3><span>${state.turn}단계 실행</span></div><div class="log-entries">${state.log.length ? state.log.slice(-5).map(e => `<p class="log-line ${e.kind === 'delivery' ? e.correct ? 'correct' : 'incorrect' : ''}"><span>${e.kind === 'forget' ? '망각' : `실행 ${e.turn}`}</span>${esc(logText(e))}</p>`).join('') : '<p class="log-empty">기억을 살펴보세요. 아직 아무 일도 일어나지 않았습니다.</p>'}</div></section>${hintVisible ? `<aside class="hint-box">${s.hint}</aside>` : ''}<p class="save-note">방을 마치고 ‘다음’을 누르면 저장됩니다. 새로고침 시 현재 방은 처음부터 시작합니다.</p></div>${memories()}</div><div class="play-controls"><div class="utility-controls">${button('undo', '↶ 되돌리기 <kbd>Z</kbd>', 'secondary', !state.history.length)}${button('restart', '다시 시작 <kbd>R</kbd>', 'quiet')}${button('hint', hintVisible ? '힌트 닫기' : '생각의 단서', 'quiet')}</div>${button('execute', '한 단계 실행 <span>▶</span><kbd>E</kbd>', 'primary execute', state.status !== 'playing')}</div><div class="sr-only" role="status" aria-live="polite" aria-atomic="true">${esc(notice)}</div></main>`;
}
function report() {
  return `<main id="main" class="story-page"><div class="story-seal">✓</div><p class="eyebrow">모든 기록 정정 완료 · 최종 보고</p><h2>이 밤을 어떻게<br><em>기억하게 할까요.</em></h2><p class="story-lead">통지서는 모두 제자리에 도착했습니다.<br>오래된 위치 기록과 그 복구 과정은 어떻게 남길까요?</p><div class="choice-grid"><button class="story-choice" data-action="report-public"><span class="choice-number">01 / PUBLIC</span><h3>공개 공지</h3><p>배송 오류와 정정 과정을 주민에게 알립니다.</p><small>공개 기록 표식 · 재검토 절차 시작</small><span class="choice-arrow">↗</span></button><button class="story-choice" data-action="report-internal"><span class="choice-number">02 / INTERNAL</span><h3>내부 보관</h3><p>원인과 조치를 기록소 내부 보고서에 남깁니다.</p><small>내부 기록 표식 · 주민 공지 없음</small><span class="choice-arrow">↗</span></button></div><p class="micro">선택은 후일담과 저장된 기록을 바꿉니다. 완료된 배송은 바뀌지 않습니다.</p></main>`;
}
function ending() {
  const e = ENDINGS[progress.report];
  if (!e) return report();
  return `<main id="main" class="story-page ending" data-ending="${progress.report}"><div class="story-seal">${progress.report === 'public' ? '↗' : '▤'}</div><p class="eyebrow">사건 기록 / ${e.badge}</p><h2>${e.title}</h2><p class="story-lead ending-text">${e.text}</p><div class="final-record"><span>잔향구 기록소 · 야간 정정 보고서</span><strong>배송 완료 5 / 5</strong><p>${e.note}</p><div><span>3개 기록 정정</span><span>${e.badge}</span><span>사건 종결</span></div></div><div class="ending-buttons">${button('rechoose', '최종 보고 다시 선택', 'primary')}${button('home', '시작 화면', 'secondary')}</div><p class="micro">끝까지 플레이해 주셔서 감사합니다.<br>어떤 기억을 지울지보다, 언제까지 남길지가 중요했던 밤이었습니다.</p></main>`;
}
function render() {
  const focused = document.activeElement;
  const key = focused?.dataset?.action || null;
  app.innerHTML = header() + (screen === 'home' ? home() : screen === 'game' ? game() : screen === 'report' ? report() : ending()) + footer();
  if (key) app.querySelector(`[data-action="${key}"]:not(:disabled)`)?.focus({ preventScroll: true });
}
function loadStage(index) {
  if (!Number.isInteger(index) || index < 0 || index >= STAGES.length || index > progress.completed.length) return;
  stageIndex = index; state = createState(STAGES[index]); owner = 'A'; selected = null; hintVisible = false;
  progress.stage = index; persist(); screen = 'game'; notice = ''; render(); window.scrollTo(0, 0);
}
function showDialog(title, body, confirmAction = null) {
  dialog.innerHTML = `<h2 id="dialog-title">${title}</h2>${body}<div class="dialog-actions">${button('cancel-dialog', confirmAction ? '취소' : '확인', 'secondary')}${confirmAction ? button(confirmAction, '처음부터 시작', 'primary') : ''}</div>`;
  dialog.showModal();
}
function apply(action) {
  const next = transition(state, action);
  if (next === state) return;
  state = next; selected = null;
  notice = action.type === 'undo' ? '직전 상태로 되돌렸습니다.' : action.type === 'restart' ? '방을 처음부터 다시 시작합니다.' : state.log.length ? logText(state.log.at(-1)) : '';
  sound(state.status === 'failure' ? 'failure' : action.type === 'delete' ? 'forget' : 'execute'); render();
}
function handle(action) {
  if (action === 'cancel-dialog') { dialog.close(); return; }
  if (action === 'help') {
    showDialog('남겨진 기억으로 행동을 설계하세요.', `<div class="help-copy"><p><b>1. 관찰</b> 현재 위치와 로봇의 기억은 다를 수 있습니다.</p><p><b>2. 삭제</b> 장면 하나를 선택해 지우세요. 가장 최근에 <strong>남은 관련 기억</strong>이 새 근거가 됩니다.</p><p><b>3. 실행</b> 모든 로봇이 편지를 한 통씩 보냅니다. 위치를 모르면 순서대로 대기합니다.</p><hr><p>한 장면은 통째로 지워집니다. 다른 로봇에게 전해진 기억은 따로 남습니다. 잘못 보냈어도 되돌릴 수 있습니다.</p><p><b>키보드</b> E 실행 · Z 되돌리기 · R 다시 시작 · Delete 선택 장면 삭제. Space는 포커스된 버튼을 누릅니다.</p><small>완료한 방과 최종 보고만 저장합니다. 진행 중인 방은 새로고침하면 초기화됩니다.</small></div>`); return;
  }
  if (action === 'sound') { progress.sound = !progress.sound; persist(); sound('execute'); render(); return; }
  if (action === 'home') { screen = 'home'; render(); window.scrollTo(0, 0); return; }
  if (action === 'start') {
    if (progress.completed.length) showDialog('새로운 기록을 시작할까요?', '<p>이 기기의 완료 기록과 최종 보고 선택이 초기화됩니다.</p>', 'confirm-start');
    else { progress = freshProgress(); loadStage(0); }
    return;
  }
  if (action === 'confirm-start') { dialog.close(); progress = freshProgress(); loadStage(0); return; }
  if (action === 'continue') {
    if (progress.report) { screen = 'ending'; render(); }
    else if (progress.completed.length === 3) { screen = 'report'; render(); }
    else loadStage(progress.stage);
    return;
  }
  if (action === 'rechoose' && progress.completed.length === 3) { screen = 'report'; render(); return; }
  if (action.startsWith('report-') && screen === 'report') {
    progress = chooseReport(progress, action.slice(7)); persist(); screen = 'ending'; render(); window.scrollTo(0, 0); return;
  }
  if (screen !== 'game') return;
  if (action === 'forget' && selected) { apply({ type: 'delete', id: selected }); return; }
  if (action === 'execute') { apply({ type: 'execute' }); return; }
  if (action === 'undo' || action === 'restart') { apply({ type: action }); return; }
  if (action === 'hint') { hintVisible = !hintVisible; render(); return; }
  if (action === 'next' && state.status === 'success') {
    progress = completeStage(progress, stageIndex); persist();
    if (stageIndex < 2) loadStage(stageIndex + 1);
    else { screen = 'report'; render(); window.scrollTo(0, 0); }
  }
}
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target || target.disabled) return;
  if (target.dataset.action) { handle(target.dataset.action); return; }
  if (screen !== 'game') return;
  if (target.dataset.robot && state.robots.some(r => r.id === target.dataset.robot)) {
    owner = target.dataset.robot; selected = null; render(); return;
  }
  if (target.dataset.card) {
    selected = target.dataset.card; render(); app.querySelector(`[data-card="${selected}"]`)?.focus({ preventScroll: true }); return;
  }
  if (target.dataset.stageIndex !== undefined) loadStage(Number(target.dataset.stageIndex));
});
document.addEventListener('keydown', event => {
  if (screen !== 'game' || dialog.open || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, textarea, select, [contenteditable]')) return;
  const action = { KeyE: 'execute', KeyZ: 'undo', KeyR: 'restart', Delete: 'forget' }[event.code];
  if (action) { event.preventDefault(); handle(action); }
  else if (event.code === 'Space' && !event.target.closest('button, a')) { event.preventDefault(); handle('execute'); }
});
render();
