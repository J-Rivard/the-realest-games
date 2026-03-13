// ── UTILS ─────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderImg(path) {
  const safe = esc(path);
  return `<img class="modal-img" src="${safe}" alt=""
    onerror="this.insertAdjacentHTML('afterend','<div class=\\'modal-img-err\\'>&#9888; Image not found: ${safe}</div>');this.remove()">`;
}

function setScreen(id, visible) {
  const el = document.getElementById(id);
  if (visible) el.classList.add('active');
  else el.classList.remove('active');
}

function setStatus(msg) {
  document.getElementById('header-status').textContent = msg;
}
