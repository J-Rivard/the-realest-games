// ── FULLSCREEN ─────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  document.getElementById('maximize-btn').textContent =
    document.fullscreenElement ? '❐' : '□';
});
