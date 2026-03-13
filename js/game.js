// ── GAME ──────────────────────────────────────────────
function startGame() {
  const names = [...document.querySelectorAll('.player-input')]
    .map(i => i.value.trim()).filter(Boolean);
  if (!names.length) return;

  players = names.map(name => ({ name, score: 0 }));
  done = new Set();
  history = [];

  categories = [...new Set(questions.map(q => q.category))];
  byCategory = {};
  categories.forEach(c => {
    byCategory[c] = questions
      .filter(q => q.category === c)
      .sort((a, b) => a.points - b.points);
  });

  assignDailyDoubles();

  setScreen('setup-screen', false);
  document.getElementById('board-container').classList.add('visible');
  document.getElementById('scoreboard').classList.add('visible');
  renderScoreboard();
  buildBoard();
  saveState();
  setStatus('Game in progress — ' + names.join(', '));
}

function newGame() {
  if (!confirm('Start a new game? This will reset all scores and return to the file loader.')) return;
  clearSave();
  done = new Set();
  history = [];
  players = [];
  questions = [];
  document.getElementById('player-list').innerHTML = '';
  document.getElementById('board-container').classList.remove('visible');
  document.getElementById('scoreboard').classList.remove('visible');
  // Reset drop zone
  document.getElementById('drop-zone').querySelector('.dz-icon').textContent = '📄';
  document.getElementById('drop-zone').querySelector('.dz-label').textContent = 'Drop CSV Here';
  document.getElementById('drop-zone').querySelector('.dz-sub').textContent = 'or click to browse';
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-continue-btn').style.display = 'none';
  document.getElementById('csv-error').style.display = 'none';
  document.getElementById('csv-file-input').value = '';
  document.getElementById('resume-panel').classList.remove('visible');
  setScreen('csv-screen', true);
  setStatus('Ready');
}

// ── SCOREBOARD ────────────────────────────────────────
function renderScoreboard() {
  const maxScore = Math.max(...players.map(p => p.score));
  document.getElementById('scoreboard').innerHTML = players.map(p => `
    <div class="score-chip ${p.score === maxScore && maxScore > 0 ? 'leader' : ''}">
      <span class="sc-name">${esc(p.name)}</span>
      <span class="sc-pts">${p.score}</span>
    </div>
  `).join('');
}

// ── DAILY DOUBLES ─────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignDailyDoubles() {
  dailyDoubles = new Set();
  const ddCount = Math.floor(categories.length / 2);
  shuffle(categories).slice(0, ddCount).forEach(cat => {
    const rowIdx = Math.floor(Math.random() * byCategory[cat].length);
    dailyDoubles.add(`${cat}|||${rowIdx}`);
  });
}

// ── BOARD ─────────────────────────────────────────────
function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${categories.length}, 1fr)`;

  categories.forEach(cat => {
    const h = document.createElement('div');
    h.className = 'cat-header';
    h.textContent = cat;
    board.appendChild(h);
  });

  const maxQ = Math.max(...categories.map(c => byCategory[c].length));
  for (let row = 0; row < maxQ; row++) {
    categories.forEach(cat => {
      const cell = document.createElement('div');
      const qs = byCategory[cat];
      if (row < qs.length) {
        const q = qs[row];
        const key = `${cat}|||${row}`;
        const isDone = done.has(key);
        const isDD = dailyDoubles.has(key);
        cell.className = 'cell' + (isDone ? ' done' : '');
        cell.textContent = isDone ? '✓' : `$${q.points}`;
        if (isDone) {
          cell.onclick = () => openResetModal(key);
          cell.title = 'Click to reset this question';
        } else {
          cell.onclick = () => openModal(cat, row, key, q.points, isDD);
        }
      } else {
        cell.className = 'cell done';
        cell.style.opacity = '0';
        cell.style.pointerEvents = 'none';
      }
      board.appendChild(cell);
    });
  }
}
