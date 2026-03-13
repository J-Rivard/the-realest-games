// ── MODAL ─────────────────────────────────────────────
function openModal(cat, idx, key, pts, isDD) {
  hideClippy();
  currentKey = key;
  currentPoints = pts;
  isDailyDouble = isDD;
  selectedPlayer = null;
  currentWager = 0;
  currentWagerPlayerIdx = null;
  swapPlayers = new Set();
  // Final question = every other question in this category is already done
  isFinalInCategory = byCategory[cat].every((q, i) => i === idx || done.has(`${cat}|||${i}`));

  document.getElementById('modal-overlay').classList.add('open');

  if (isDD) {
    showDDPhase(cat);
  } else {
    showQuestion();
  }

  syncModalToFirebase({
    open: true, key, phase: isDailyDouble ? 'dd-select' : 'question',
    isDailyDouble, currentWager: 0, wagerPlayerIdx: null,
    answerRevealed: false, answerText: null,
    currentPoints: pts, isFinalInCategory
  });
}

function showDDPhase(cat) {
  document.getElementById('modal-title').textContent = 'Daily Double!';
  document.getElementById('dd-section').style.display = 'block';
  document.getElementById('question-section').style.display = 'none';
  document.getElementById('dd-cat').textContent = cat.toUpperCase();
  document.getElementById('dd-wager-section').style.display = 'none';
  document.getElementById('dd-confirm-btn').disabled = true;

  document.getElementById('dd-player-btns').innerHTML = players.map((p, i) =>
    `<button class="dd-player-btn" id="dd-pb-${i}" onclick="selectDDPlayer(${i})">${esc(p.name)}</button>`
  ).join('');
}

function selectDDPlayer(idx) {
  document.querySelectorAll('.dd-player-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById(`dd-pb-${idx}`).classList.add('selected');
  currentWagerPlayerIdx = idx;

  const score = players[idx].score;
  const max = Math.max(score, 1);
  document.getElementById('dd-wager-range').textContent =
    `Enter $1 – $${max}  (current score: $${score})`;

  const inp = document.getElementById('dd-wager-input');
  inp.min = 1;
  inp.max = max;
  inp.value = '';
  document.getElementById('dd-confirm-btn').disabled = true;
  document.getElementById('dd-wager-section').style.display = 'block';
  inp.focus();
}

function checkWagerValid() {
  const inp = document.getElementById('dd-wager-input');
  const val = parseInt(inp.value, 10);
  document.getElementById('dd-confirm-btn').disabled =
    isNaN(val) || val < +inp.min || val > +inp.max;
}

function confirmDDWager() {
  currentWager = parseInt(document.getElementById('dd-wager-input').value, 10);
  showQuestion();
  syncModalToFirebase({
    open: true, key: currentKey, phase: 'question',
    isDailyDouble: true, currentWager, wagerPlayerIdx: currentWagerPlayerIdx,
    answerRevealed: false, answerText: null,
    currentPoints, isFinalInCategory
  });
}

function showQuestion() {
  const [cat] = currentKey.split('|||');
  const [, idxStr] = currentKey.split('|||');
  const q = byCategory[cat][+idxStr];

  document.getElementById('modal-title').textContent = cat.toUpperCase();
  document.getElementById('dd-section').style.display = 'none';
  document.getElementById('question-section').style.display = 'block';

  document.getElementById('modal-category').textContent = cat.toUpperCase();

  if (isDailyDouble) {
    document.getElementById('modal-points').innerHTML =
      `<span style="font-family:'VT323',monospace;color:var(--usf-au)">DAILY DOUBLE</span><br>` +
      `<span style="font-size:1.1rem;font-family:'Courier New',monospace;color:var(--usf-g)">` +
      `Wager: $${currentWager}</span>`;
  } else {
    document.getElementById('modal-points').textContent = `$${currentPoints}`;
  }

  document.getElementById('final-badge').style.display = isFinalInCategory && !isDailyDouble ? 'block' : 'none';
  document.getElementById('modal-question').innerHTML =
    (q.question ? `<span>${esc(q.question)}</span>` : '') +
    (q.question_image ? renderImg(q.question_image) : '');
  document.getElementById('modal-answer').style.display = 'none';
  document.getElementById('modal-answer').textContent = '';
  document.getElementById('answer-label').style.display = 'none';
  document.getElementById('point-assign').classList.remove('visible');
  document.getElementById('swap-section').style.display = 'none';
  document.getElementById('modal-actions').innerHTML =
    `<button class="btn btn-gold" onclick="revealAnswer()">Reveal Answer</button>`;
}

function revealAnswer() {
  const [cat, idxStr] = currentKey.split('|||');
  const q = byCategory[cat][+idxStr];

  document.getElementById('answer-label').style.display = 'block';
  const ansEl = document.getElementById('modal-answer');
  ansEl.innerHTML =
    `<span>${esc(q.answer || '(No answer recorded \u2014 group decides!)')}</span>` +
    (q.answer_image ? renderImg(q.answer_image) : '');
  ansEl.style.display = 'block';

  document.getElementById('point-assign').classList.add('visible');

  syncModalToFirebase({
    open: true, key: currentKey, phase: 'question',
    isDailyDouble, currentWager, wagerPlayerIdx: currentWagerPlayerIdx,
    answerRevealed: true,
    answerText: q.answer || '(No answer recorded \u2014 group decides!)',
    currentPoints, isFinalInCategory
  });

  if (isDailyDouble) {
    document.getElementById('point-assign-label').textContent = 'Wagering player';
    document.getElementById('player-btns').innerHTML = players.map((p, i) =>
      i === currentWagerPlayerIdx
        ? `<button class="player-award-btn dd-wagered" disabled>${esc(p.name)}</button>`
        : `<button class="player-award-btn" disabled style="opacity:0.2">${esc(p.name)}</button>`
    ).join('');
    document.getElementById('modal-actions').innerHTML = `
      <button class="btn btn-green" onclick="ddCorrect()">&#10003; Correct (+$${currentWager})</button>
      <button class="btn btn-red"   onclick="ddWrong()">&#10007; Wrong (&minus;$${currentWager})</button>
    `;
  } else {
    document.getElementById('point-assign-label').textContent = 'Award points to';
    document.getElementById('player-btns').innerHTML = players.map((p, i) =>
      `<button class="player-award-btn" id="award-btn-${i}" onclick="togglePlayer(${i})">${esc(p.name)}</button>`
    ).join('');
    showNormalActions();
  }
}

function showNormalActions() {
  document.getElementById('modal-actions').innerHTML = isFinalInCategory ? `
    <button class="btn btn-green" id="done-btn" onclick="awardAndClose()" disabled>&#10003; Done</button>
    <button class="btn btn-swap"  onclick="enterSwapMode()">&#8596; Swap Scores</button>
    <button class="btn btn-dim"   onclick="noPointsAndClose()">No Points</button>
  ` : `
    <button class="btn btn-green" id="done-btn" onclick="awardAndClose()" disabled>&#10003; Done</button>
    <button class="btn btn-dim"   onclick="noPointsAndClose()">No Points</button>
  `;
}

function enterSwapMode() {
  swapPlayers = new Set();
  document.getElementById('point-assign').classList.remove('visible');
  document.getElementById('swap-section').style.display = 'block';
  document.getElementById('swap-player-btns').innerHTML = players.map((p, i) => `
    <button class="swap-player-btn" id="swap-btn-${i}" onclick="toggleSwapPlayer(${i})">
      ${esc(p.name)}<span class="swap-score">$${p.score}</span>
    </button>
  `).join('');
  document.getElementById('modal-actions').innerHTML = `
    <button class="btn btn-swap" id="swap-confirm-btn" disabled onclick="confirmSwap()">&#8596; Confirm Swap</button>
    <button class="btn btn-dim" onclick="cancelSwap()">Cancel</button>
  `;
}

function toggleSwapPlayer(idx) {
  const btn = document.getElementById(`swap-btn-${idx}`);
  if (swapPlayers.has(idx)) {
    swapPlayers.delete(idx);
    btn.classList.remove('selected');
  } else {
    if (swapPlayers.size >= 2) return;
    swapPlayers.add(idx);
    btn.classList.add('selected');
  }
  // Disable unchosen buttons once 2 are selected
  const full = swapPlayers.size === 2;
  players.forEach((p, i) => {
    const b = document.getElementById(`swap-btn-${i}`);
    if (b) b.disabled = full && !swapPlayers.has(i);
  });
  document.getElementById('swap-confirm-btn').disabled = swapPlayers.size !== 2;
}

function confirmSwap() {
  const [p1, p2] = [...swapPlayers];
  history.push({ key: currentKey, type: 'swap', p1, p2, p1score: players[p1].score, p2score: players[p2].score });
  const tmp = players[p1].score;
  players[p1].score = players[p2].score;
  players[p2].score = tmp;
  renderScoreboard();
  done.add(currentKey);
  saveState();
  closeModal();
}

function cancelSwap() {
  swapPlayers = new Set();
  document.getElementById('swap-section').style.display = 'none';
  document.getElementById('point-assign').classList.add('visible');
  showNormalActions();
}

function togglePlayer(idx) {
  if (selectedPlayer === idx) {
    document.getElementById(`award-btn-${idx}`).classList.remove('selected');
    selectedPlayer = null;
  } else {
    if (selectedPlayer !== null) {
      const prev = document.getElementById(`award-btn-${selectedPlayer}`);
      if (prev) prev.classList.remove('selected');
    }
    selectedPlayer = idx;
    document.getElementById(`award-btn-${idx}`).classList.add('selected');
  }
  const doneBtn = document.getElementById('done-btn');
  if (doneBtn) doneBtn.disabled = selectedPlayer === null;
}

function awardAndClose() {
  if (selectedPlayer !== null) {
    history.push({ key: currentKey, type: 'award', playerIdx: selectedPlayer, delta: currentPoints });
    players[selectedPlayer].score += currentPoints;
    renderScoreboard();
  }
  done.add(currentKey);
  saveState();
  closeModal();
  maybeShowClippy(selectedPlayer !== null);
}

function noPointsAndClose() {
  history.push({ key: currentKey, type: 'no_points' });
  done.add(currentKey);
  saveState();
  closeModal();
  maybeShowClippy(false);
}

function ddCorrect() {
  history.push({ key: currentKey, type: 'award', playerIdx: currentWagerPlayerIdx, delta: currentWager });
  players[currentWagerPlayerIdx].score += currentWager;
  renderScoreboard();
  done.add(currentKey);
  saveState();
  closeModal();
  maybeShowClippy(true);
}

function ddWrong() {
  history.push({ key: currentKey, type: 'award', playerIdx: currentWagerPlayerIdx, delta: -currentWager });
  players[currentWagerPlayerIdx].score -= currentWager;
  renderScoreboard();
  done.add(currentKey);
  saveState();
  closeModal();
  maybeShowClippy(false);
}

function closeModal() {
  syncModalToFirebase({
    open: false, key: null, phase: null,
    isDailyDouble: false, currentWager: 0, wagerPlayerIdx: null,
    answerRevealed: false, answerText: null,
    currentPoints: 0, isFinalInCategory: false
  });
  document.getElementById('modal-overlay').classList.remove('open');
  buildBoard();
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay') && !isViewing) closeModal();
});
