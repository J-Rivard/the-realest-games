// ── PLAYER SETUP ──────────────────────────────────────
function addPlayerRow() {
  const list = document.getElementById('player-list');
  const row = document.createElement('div');
  row.className = 'player-row';
  row.innerHTML = `
    <input class="player-input" type="text" placeholder="Player name..." maxlength="20"
      oninput="checkStartable()" onkeydown="if(event.key==='Enter') addPlayerRow()">
    <button class="remove-btn" onclick="this.closest('.player-row').remove(); checkStartable()">✕</button>
  `;
  list.appendChild(row);
  row.querySelector('input').focus();
  checkStartable();
}

function checkStartable() {
  const any = [...document.querySelectorAll('.player-input')].some(i => i.value.trim());
  document.getElementById('start-btn').disabled = !any;
}
