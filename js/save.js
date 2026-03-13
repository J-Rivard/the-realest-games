// ── SAVE STATE ─────────────────────────────────────────
const SAVE_KEY = 'jeopardy_save';

function saveState() {
  if (!players.length) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      questions,
      players,
      categories,
      done: [...done],
      dailyDoubles: [...dailyDoubles],
      history
    }));
  } catch(e) { /* quota or private mode — fail silently */ }
  // Mirror to Firebase if hosting
  if (typeof syncToFirebase === 'function') syncToFirebase();
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function checkForSave() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch(e) { return; }
  if (!raw) return;
  let state;
  try { state = JSON.parse(raw); } catch(e) { clearSave(); return; }
  if (!state || state.version !== 1 || !state.players || !state.questions) { clearSave(); return; }

  const panel = document.getElementById('resume-panel');
  panel.classList.add('visible');

  document.getElementById('resume-scores').innerHTML = state.players.map(p =>
    `<div class="resume-chip"><div class="rc-name">${esc(p.name)}</div><div class="rc-score">$${p.score}</div></div>`
  ).join('');
  document.getElementById('resume-meta').textContent =
    `${formatTimeAgo(state.savedAt)} \u2014 ${state.done.length} of ${state.questions.length} questions done`;
}

function resumeGame() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch(e) { return; }
  if (!raw) return;
  let state;
  try { state = JSON.parse(raw); } catch(e) { clearSave(); return; }

  questions     = state.questions;
  players       = state.players;
  categories    = state.categories;
  done          = new Set(state.done);
  dailyDoubles  = new Set(state.dailyDoubles);
  history       = state.history || [];

  byCategory = {};
  categories.forEach(c => {
    byCategory[c] = questions.filter(q => q.category === c).sort((a, b) => a.points - b.points);
  });

  setScreen('csv-screen', false);
  document.getElementById('board-container').classList.add('visible');
  document.getElementById('scoreboard').classList.add('visible');
  renderScoreboard();
  buildBoard();
  setStatus('Game resumed \u2014 ' + players.map(p => p.name).join(', '));
}

function discardSave() {
  if (!confirm('Discard the saved game? This cannot be undone.')) return;
  clearSave();
  document.getElementById('resume-panel').classList.remove('visible');
}

// Check for a saved game on load
checkForSave();
