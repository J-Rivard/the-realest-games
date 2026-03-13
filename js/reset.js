// ── RESET ─────────────────────────────────────────────
function openResetModal(key) {
  const [cat, idxStr] = key.split('|||');
  const q = byCategory[cat][+idxStr];
  const entry = history.find(h => h.key === key);

  document.getElementById('reset-info').innerHTML =
    `<strong>${esc(cat)}</strong> &mdash; $${q.points}`;

  let whatHtml;
  if (!entry) {
    whatHtml = 'No record found. Only the completion status will be cleared.';
  } else if (entry.type === 'award') {
    const pname = esc(players[entry.playerIdx].name);
    if (entry.delta > 0) {
      whatHtml = `<strong>${pname}</strong> was awarded <strong>$${entry.delta}</strong>.`;
    } else {
      whatHtml = `<strong>${pname}</strong> lost <strong>$${Math.abs(entry.delta)}</strong> (Daily Double — wrong answer).`;
    }
  } else if (entry.type === 'no_points') {
    whatHtml = 'No points were awarded.';
  } else if (entry.type === 'swap') {
    const p1n = esc(players[entry.p1].name);
    const p2n = esc(players[entry.p2].name);
    whatHtml = `<strong>${p1n}</strong> and <strong>${p2n}</strong> swapped scores ($${entry.p1score} \u2194 $${entry.p2score}).`;
  }

  resetTargetKey = key;
  document.getElementById('reset-what').innerHTML = whatHtml;
  document.getElementById('reset-overlay').classList.add('open');
}

function closeResetModal() {
  document.getElementById('reset-overlay').classList.remove('open');
  resetTargetKey = null;
}

function confirmReset() {
  if (!resetTargetKey) return;
  const key = resetTargetKey;
  const entry = history.find(h => h.key === key);

  if (entry) {
    if (entry.type === 'award') {
      players[entry.playerIdx].score -= entry.delta;
    } else if (entry.type === 'swap') {
      players[entry.p1].score = entry.p1score;
      players[entry.p2].score = entry.p2score;
    }
    history = history.filter(h => h.key !== key);
  }

  done.delete(key);
  renderScoreboard();
  closeResetModal();
  buildBoard();
  saveState();
}
