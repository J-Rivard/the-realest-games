// ── LOBBY (GM side) ────────────────────────────────────

let lobbyPlayers = {};
let _lobbyUnsubscribe = null;

async function createLobby() {
  if (!initFirebase()) {
    // Fallback to local setup screen if Firebase fails
    setScreen('csv-screen', false);
    setScreen('setup-screen', true);
    if (document.querySelectorAll('.player-row').length === 0) {
      addPlayerRow(); addPlayerRow(); addPlayerRow(); addPlayerRow();
    }
    setStatus('Player setup (local — Firebase unavailable)');
    return;
  }

  const code = generateRoomCode();
  currentRoomCode = code;
  isHosting = true;

  const initialState = {
    status:       'waiting',
    questions:    _scrubbedQuestions(),
    players:      {},
    categories:   [],
    done:         [],
    dailyDoubles: [],
    history:      [],
    modal:        { ..._MODAL_CLOSED },
    buzzer:       null
  };

  try {
    await fbCreateRoom(code, initialState);
  } catch (e) {
    console.warn('[lobby] Failed to create room:', e);
    isHosting = false;
    currentRoomCode = null;
    setStatus('Failed to create Firebase room — playing locally.');
    // Fallback to local setup
    setScreen('csv-screen', false);
    setScreen('setup-screen', true);
    if (document.querySelectorAll('.player-row').length === 0) {
      addPlayerRow(); addPlayerRow(); addPlayerRow(); addPlayerRow();
    }
    return;
  }

  window.addEventListener('beforeunload', () => fbDeleteRoom(currentRoomCode));

  document.getElementById('lobby-code').textContent = code;
  _setMpBadge('\uD83D\uDCE1  Room: ' + code, 'hosting');
  setScreen('csv-screen', false);
  setScreen('lobby-screen', true);
  setStatus('Lobby open — ' + code);

  lobbyPlayers = {};
  _renderLobbyPlayers({});

  _lobbyUnsubscribe = fbSubscribeRoom(code, _onLobbyUpdate);
}

function _onLobbyUpdate(state) {
  if (!state) return;
  if (state.status !== 'waiting') return;
  lobbyPlayers = state.players || {};
  _renderLobbyPlayers(lobbyPlayers);
}

function _renderLobbyPlayers(playersObj) {
  const list = document.getElementById('lobby-player-list');
  const startBtn = document.getElementById('lobby-start-btn');
  const entries = Object.entries(playersObj || {});

  if (entries.length === 0) {
    list.innerHTML = '<div class="lobby-empty">Waiting for players to join&hellip;</div>';
    startBtn.disabled = true;
    return;
  }

  list.innerHTML = entries
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
    .map(([id, p]) => `
      <div class="lobby-player-row">
        <span class="lobby-player-name">${esc(p.name)}</span>
        <button class="btn btn-red btn-sm" onclick="kickPlayer('${esc(id)}')">Kick</button>
      </div>
    `).join('');

  startBtn.disabled = entries.length === 0;
}

async function kickPlayer(playerId) {
  await fbRemovePlayer(currentRoomCode, playerId);
}

async function startGameFromLobby() {
  if (!currentRoomCode) return;

  // Convert lobbyPlayers object → sorted array
  const sortedEntries = Object.entries(lobbyPlayers)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));

  players = sortedEntries.map(([id, p]) => ({ id, name: p.name, score: 0 }));

  // Unsubscribe lobby watcher before writing new status
  if (_lobbyUnsubscribe) {
    _lobbyUnsubscribe();
    _lobbyUnsubscribe = null;
  }

  initGameState();

  setScreen('lobby-screen', false);
  document.getElementById('board-container').classList.add('visible');
  document.getElementById('scoreboard').classList.add('visible');
  renderScoreboard();
  buildBoard();
  saveState();
  setStatus('Game in progress — ' + players.map(p => p.name).join(', '));

  // Build Firebase players object (reset scores to 0)
  const fbPlayersObj = {};
  players.forEach(p => {
    fbPlayersObj[p.id] = { name: p.name, score: 0, joinedAt: lobbyPlayers[p.id]?.joinedAt || Date.now() };
  });

  try {
    await fbUpdateState(currentRoomCode, {
      status:       'playing',
      players:      fbPlayersObj,
      categories,
      done:         [],
      dailyDoubles: [...dailyDoubles],
      history:      [],
      questions:    _scrubbedQuestions()
    });
  } catch (e) {
    console.warn('[lobby] Failed to update game state:', e);
  }

  _subscribeBuzzerNotifications();
}

async function cancelLobby() {
  if (!confirm('Cancel the lobby? All waiting players will be disconnected.')) return;
  if (_lobbyUnsubscribe) {
    _lobbyUnsubscribe();
    _lobbyUnsubscribe = null;
  }
  await stopHosting();
  lobbyPlayers = {};
  setScreen('lobby-screen', false);
  setScreen('csv-screen', true);
  setStatus('Ready');
}

// ── BUZZER (GM side) ───────────────────────────────────
let _buzzerUnsubscribe = null;

function _subscribeBuzzerNotifications() {
  if (!currentRoomCode) return;
  if (_buzzerUnsubscribe) {
    _buzzerUnsubscribe();
    _buzzerUnsubscribe = null;
  }
  const ref = roomRef(currentRoomCode).child('buzzer');
  ref.on('value', snap => _updateGMBuzzerDisplay(snap.val()));
  _buzzerUnsubscribe = () => ref.off('value');
}

function _updateGMBuzzerDisplay(buzzer) {
  const notif = document.getElementById('buzzer-notification');
  const nameEl = document.getElementById('buzzer-player-name');
  if (buzzer && buzzer.playerName) {
    nameEl.textContent = '\uD83D\uDD14 ' + buzzer.playerName + ' buzzed!';
    notif.style.display = 'flex';
  } else {
    notif.style.display = 'none';
  }
}

async function clearBuzzer() {
  if (!currentRoomCode) return;
  await fbClearBuzzer(currentRoomCode);
}
