// ── SYNC ───────────────────────────────────────────────

// ── HELPERS ────────────────────────────────────────────
function _scrubbedQuestions() {
  // Strip answer fields so viewers cannot see them before GM reveals
  return questions.map(q => ({
    category:       q.category,
    question:       q.question       || null,
    question_image: q.question_image || null,
    points:         q.points
  }));
}

function _buildBoardState() {
  // Convert players array → object keyed by id (or fallback key)
  const playersObj = {};
  players.forEach((p, i) => {
    const key = p.id || ('local' + i);
    playersObj[key] = { name: p.name, score: p.score };
  });
  return {
    players:      playersObj,
    categories,
    done:         [...done],
    dailyDoubles: [...dailyDoubles],
    history,
    questions:    _scrubbedQuestions()
  };
}

const _MODAL_CLOSED = {
  open: false, key: null, phase: null,
  isDailyDouble: false, currentWager: 0, wagerPlayerIdx: null,
  answerRevealed: false, answerText: null,
  currentPoints: 0, isFinalInCategory: false
};

// ── HOST ───────────────────────────────────────────────
async function syncToFirebase() {
  if (!isHosting || !currentRoomCode) return;
  if (!initFirebase()) return;
  try {
    await fbUpdateState(currentRoomCode, _buildBoardState());
  } catch (e) {
    console.warn('[sync] Board state write failed:', e);
  }
}

async function syncModalToFirebase(modalData) {
  if (!isHosting || !currentRoomCode) return;
  if (!initFirebase()) return;
  try {
    await fbUpdateModal(currentRoomCode, modalData);
  } catch (e) {
    console.warn('[sync] Modal write failed:', e);
  }
}

async function startHosting() {
  if (!initFirebase()) {
    setStatus('Firebase not configured — game is local only.');
    return false;
  }
  currentRoomCode = generateRoomCode();
  isHosting = true;
  try {
    await fbCreateRoom(currentRoomCode, {
      ..._buildBoardState(),
      modal: { ..._MODAL_CLOSED }
    });
    _setMpBadge('\uD83D\uDCE1  Room: ' + currentRoomCode, 'hosting');
    window.addEventListener('beforeunload', () => fbDeleteRoom(currentRoomCode));
    return true;
  } catch (e) {
    console.warn('[sync] Failed to create room:', e);
    isHosting = false;
    currentRoomCode = null;
    setStatus('Failed to create Firebase room — playing locally.');
    return false;
  }
}

async function stopHosting() {
  if (!isHosting) return;
  if (currentRoomCode) await fbDeleteRoom(currentRoomCode);
  isHosting = false;
  currentRoomCode = null;
  _clearMpBadge();
}

// ── VIEWER ─────────────────────────────────────────────
function _applyViewerState(state) {
  if (!state) {
    if (typeof _onRoomClosed === 'function') {
      _onRoomClosed('Host ended the session.');
    } else {
      setStatus('Host ended the session.');
      isViewing = false;
      if (viewerUnsubscribe) { viewerUnsubscribe(); viewerUnsubscribe = null; }
      _clearMpBadge();
    }
    return;
  }

  // Restore board state — parse players from object format
  const rawPlayers = state.players || {};
  questions    = (state.questions    || []).map(q => ({ ...q }));
  players      = Object.entries(rawPlayers)
    .map(([id, p]) => ({ id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
  categories   = state.categories    || [];
  done         = new Set(state.done  || []);
  dailyDoubles = new Set(state.dailyDoubles || []);
  history      = state.history       || [];

  byCategory = {};
  categories.forEach(c => {
    byCategory[c] = questions
      .filter(q => q.category === c)
      .sort((a, b) => a.points - b.points);
  });

  renderScoreboard();
  buildBoard(); // isViewing=true → buildBoard skips onclick handlers

  // Apply modal state
  const m = state.modal;
  if (!m || !m.open) {
    document.getElementById('modal-overlay').classList.remove('open');
    return;
  }

  // Restore modal context globals before calling show functions
  currentKey            = m.key;
  currentPoints         = m.currentPoints    || 0;
  isDailyDouble         = m.isDailyDouble     || false;
  currentWager          = m.currentWager      || 0;
  currentWagerPlayerIdx = m.wagerPlayerIdx != null ? m.wagerPlayerIdx : null;
  isFinalInCategory     = m.isFinalInCategory || false;

  document.getElementById('modal-overlay').classList.add('open');

  if (m.phase === 'dd-select') {
    const [cat] = (m.key || '').split('|||');
    showDDPhase(cat);
  } else if (m.phase === 'question') {
    showQuestion();
    if (m.answerRevealed && m.answerText != null) {
      document.getElementById('answer-label').style.display = 'block';
      const ansEl = document.getElementById('modal-answer');
      ansEl.textContent = m.answerText;
      ansEl.style.display = 'block';
    }
  }

  // Strip all interactive controls — viewers are read-only
  document.getElementById('modal-actions').innerHTML = '';
  document.getElementById('dd-confirm-area').innerHTML = '';
  document.querySelectorAll('.dd-player-btn, .player-award-btn').forEach(b => {
    b.disabled         = true;
    b.style.pointerEvents = 'none';
  });
  document.getElementById('swap-section').style.display = 'none';
  document.getElementById('modal-close-btn').style.display = 'none';
}

// ── BADGE ──────────────────────────────────────────────
function _setMpBadge(text, mode) {
  const el = document.getElementById('mp-badge');
  el.textContent = text;
  el.className   = mode; // 'hosting' | 'viewing' | 'player'
}

function _clearMpBadge() {
  const el = document.getElementById('mp-badge');
  el.textContent = '';
  el.className   = '';
}
