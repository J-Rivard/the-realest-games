// ── PLAYER CLIENT ──────────────────────────────────────

const PLAYER_SESSION_KEY = 'otr_player';

let myPlayerId = null;
let myPlayerName = null;

let _playerUnsubscribe = null;

function generatePlayerId() {
  return 'p-' + Math.random().toString(36).slice(2, 11);
}

async function joinGame() {
  const codeInput = document.getElementById('join-code-input');
  const nameInput = document.getElementById('join-name-input');
  const errEl     = document.getElementById('join-error');
  const joinBtn   = document.getElementById('join-btn');

  errEl.textContent = '';
  const code = (codeInput.value || '').trim().toUpperCase();
  const name = (nameInput.value || '').trim();

  if (!/^OTR-\d{4}$/.test(code)) {
    errEl.textContent = 'Format must be OTR-0000';
    return;
  }
  if (!initFirebase()) {
    errEl.textContent = 'Firebase not configured — joining unavailable.';
    return;
  }

  joinBtn.disabled    = true;
  joinBtn.textContent = 'Joining\u2026';

  const room = await fbGetRoom(code);
  if (!room) {
    errEl.textContent   = 'Room "' + code + '" not found. Check the code.';
    joinBtn.disabled    = false;
    joinBtn.textContent = 'Join';
    return;
  }

  if (!name) {
    await _joinAsViewerWithCode(code, room);
  } else {
    await _joinAsPlayerWithCode(code, name, room);
  }

  joinBtn.disabled    = false;
  joinBtn.textContent = 'Join';
}

async function _joinAsViewerWithCode(code, room) {
  const errEl = document.getElementById('join-error');

  isViewing      = true;
  currentRoomCode = code;
  _setMpBadge('\uD83D\uDC41  Viewing: ' + code, 'viewing');

  const ngb = document.getElementById('new-game-btn');
  if (ngb) ngb.style.display = 'none';

  if (room.status === 'waiting') {
    _showWaitingScreen('Waiting for game to start\u2026');
    viewerUnsubscribe = fbSubscribeRoom(code, state => {
      if (!state) {
        _onRoomClosed('Host ended the session.');
        return;
      }
      if (state.status === 'playing') {
        // Transition to board
        if (viewerUnsubscribe) { viewerUnsubscribe(); viewerUnsubscribe = null; }
        setScreen('waiting-screen', false);
        document.getElementById('board-container').classList.add('visible');
        document.getElementById('scoreboard').classList.add('visible');
        viewerUnsubscribe = fbSubscribeRoom(code, _applyViewerState);
        setStatus('Viewing room ' + code);
      } else if (state.status === 'waiting') {
        _updateWaitingPlayers(state.players || {});
      }
    });
  } else if (room.status === 'playing') {
    setScreen('csv-screen', false);
    document.getElementById('board-container').classList.add('visible');
    document.getElementById('scoreboard').classList.add('visible');
    viewerUnsubscribe = fbSubscribeRoom(code, _applyViewerState);
    setStatus('Viewing room ' + code);
  } else {
    document.getElementById('join-error').textContent = 'Game is not available to join.';
    isViewing = false;
    currentRoomCode = null;
    _clearMpBadge();
  }
}

async function _joinAsPlayerWithCode(code, name, room) {
  const errEl = document.getElementById('join-error');

  if (room.status !== 'waiting') {
    errEl.textContent = 'Game already in progress — cannot join.';
    return;
  }

  // Check if name is already taken (case insensitive)
  const existingPlayers = room.players || {};
  const nameTaken = Object.values(existingPlayers)
    .some(p => p.name.toLowerCase() === name.toLowerCase());
  if (nameTaken) {
    errEl.textContent = 'That name is already taken. Choose another.';
    return;
  }

  const playerId = generatePlayerId();
  myPlayerId   = playerId;
  myPlayerName = name;
  currentRoomCode = code;
  isPlayer = true;

  try {
    await fbAddPlayer(code, playerId, { name, score: 0, joinedAt: Date.now() });
  } catch (e) {
    errEl.textContent = 'Failed to join room. Try again.';
    myPlayerId   = null;
    myPlayerName = null;
    currentRoomCode = null;
    isPlayer = false;
    return;
  }

  // Save session to localStorage for rejoin
  try {
    localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({ roomCode: code, playerId, playerName: name }));
  } catch (e) {}

  _setMpBadge('\uD83C\uDFAE  Playing: ' + name, 'player');
  _showWaitingScreen('Joined! Waiting for the host to start\u2026');

  _playerUnsubscribe = fbSubscribeRoom(code, _applyPlayerState);
}

async function tryRejoinAsPlayer() {
  let session;
  try {
    const raw = localStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) return false;
    session = JSON.parse(raw);
  } catch (e) { return false; }

  if (!session || !session.roomCode || !session.playerId || !session.playerName) return false;
  if (!initFirebase()) return false;

  const room = await fbGetRoom(session.roomCode);
  if (!room) {
    try { localStorage.removeItem(PLAYER_SESSION_KEY); } catch (e) {}
    return false;
  }

  const players_ = room.players || {};
  if (!players_[session.playerId]) {
    // Player was kicked or room changed
    try { localStorage.removeItem(PLAYER_SESSION_KEY); } catch (e) {}
    return false;
  }

  myPlayerId      = session.playerId;
  myPlayerName    = session.playerName;
  currentRoomCode = session.roomCode;
  isPlayer        = true;

  _setMpBadge('\uD83C\uDFAE  Playing: ' + myPlayerName, 'player');

  if (room.status === 'waiting') {
    _showWaitingScreen('Rejoined! Waiting for the host to start\u2026');
    _updateWaitingPlayers(players_);
  } else if (room.status === 'playing') {
    _showPlayerGameScreen();
    _renderPlayerState(room);
  }

  _playerUnsubscribe = fbSubscribeRoom(session.roomCode, _applyPlayerState);
  return true;
}

function _showWaitingScreen(message) {
  const titleEl = document.getElementById('waiting-title');
  if (titleEl) titleEl.textContent = message || 'Waiting';
  setScreen('csv-screen', false);
  setScreen('waiting-screen', true);
  setStatus('Waiting for game to start');
}

function _updateWaitingPlayers(playersObj) {
  const list = document.getElementById('waiting-player-list');
  if (!list) return;
  const entries = Object.entries(playersObj || {});
  list.innerHTML = entries
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
    .map(([, p]) => `<div class="waiting-player-chip">${esc(p.name)}</div>`)
    .join('');
}

function _showPlayerGameScreen() {
  const nameEl = document.getElementById('player-screen-name');
  if (nameEl) nameEl.textContent = myPlayerName || '';
  setScreen('waiting-screen', false);
  setScreen('player-screen', true);
  setStatus('Playing as ' + (myPlayerName || ''));
}

function _applyPlayerState(state) {
  if (!state) {
    _onRoomClosed('The host ended the game.');
    return;
  }

  const players_ = state.players || {};

  // Check if we were kicked
  if (isPlayer && myPlayerId && !players_[myPlayerId]) {
    _onRoomClosed('You were removed from the game.');
    return;
  }

  if (state.status === 'waiting') {
    _updateWaitingPlayers(players_);
    return;
  }

  if (state.status === 'playing') {
    // Transition from waiting screen to player screen if needed
    const waitingScreen = document.getElementById('waiting-screen');
    const playerScreen  = document.getElementById('player-screen');
    if (waitingScreen && waitingScreen.classList.contains('active')) {
      _showPlayerGameScreen();
    }
    _renderPlayerState(state);
  }
}

function _renderPlayerState(state) {
  const players_ = state.players || {};

  // Build sorted array for scoreboard display (sort by score desc)
  const sorted = Object.entries(players_)
    .map(([id, p]) => ({ id, name: p.name, score: p.score || 0 }))
    .sort((a, b) => b.score - a.score);

  const board = document.getElementById('player-scoreboard');
  if (board) {
    board.innerHTML = sorted.map(p => `
      <div class="ps-chip ${p.id === myPlayerId ? 'me' : ''}">
        <span class="ps-name">${esc(p.name)}</span>
        <span class="ps-score">${p.score}</span>
      </div>
    `).join('');
  }

  _updateBuzzerUI(state.buzzer || null);
}

async function pressBuzzer() {
  if (!currentRoomCode || !myPlayerId || !myPlayerName) return;
  const btn = document.getElementById('buzz-btn');
  if (btn) btn.disabled = true;
  try {
    await fbBuzz(currentRoomCode, myPlayerId, myPlayerName);
  } catch (e) {
    console.warn('[player] Buzz failed:', e);
    if (btn) btn.disabled = false;
  }
}

function _updateBuzzerUI(buzzer) {
  const btn    = document.getElementById('buzz-btn');
  const status = document.getElementById('buzzer-status');
  if (!btn || !status) return;

  if (!buzzer) {
    btn.disabled = false;
    btn.className = 'buzz-btn';
    btn.innerHTML = '&#128276; BUZZ!';
    status.textContent = '';
  } else if (buzzer.playerId === myPlayerId) {
    btn.disabled = false;
    btn.className = 'buzz-btn buzzed-me';
    btn.innerHTML = '&#128276; YOU BUZZED!';
    status.textContent = 'Waiting for GM\u2026';
  } else {
    btn.disabled = true;
    btn.className = 'buzz-btn buzzed-other';
    btn.innerHTML = '&#128276; BUZZ!';
    status.textContent = (buzzer.playerName || 'Someone') + ' buzzed first!';
  }
}

function _onRoomClosed(msg) {
  if (_playerUnsubscribe) {
    _playerUnsubscribe();
    _playerUnsubscribe = null;
  }
  if (viewerUnsubscribe) {
    viewerUnsubscribe();
    viewerUnsubscribe = null;
  }

  try { localStorage.removeItem(PLAYER_SESSION_KEY); } catch (e) {}

  isPlayer        = false;
  isViewing       = false;
  myPlayerId      = null;
  myPlayerName    = null;
  currentRoomCode = null;

  _clearMpBadge();

  setScreen('waiting-screen', false);
  setScreen('player-screen', false);
  setScreen('lobby-screen', false);
  setScreen('csv-screen', true);

  const ngb = document.getElementById('new-game-btn');
  if (ngb) ngb.style.display = '';

  setStatus(msg || 'Disconnected from room.');
}
