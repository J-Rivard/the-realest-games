// ── CLIPPY ─────────────────────────────────────────────
const clippyQuipsCorrect = [
  "It looks like you answered correctly. Shall I format your victory lap?",
  "It looks like someone just scored points. Would you like a certificate?",
  "Correct! It looks like you'd like to gloat. I can help with that.",
  "It looks like you know things. Impressive.",
  "It looks like you've done this before.",
  "Points awarded. It looks like you knew that one.",
  "It looks like you're on a roll. Would you like help staying there?",
  "Correct answer logged. Printing trophy... [ERROR: no printer found]",
  "It looks like someone's been studying.",
  "It looks like you'd like to continue winning. I'll allow it.",
  "Answer detected as correct. Updating internal scorecard...",
  "It looks like you're dangerous. Noted.",
  "It looks like the rest of the group should be nervous.",
  "Correct. It looks like you'd like more of that feeling.",
  "It looks like you just peaked. Or maybe not. We'll see.",
];

const clippyQuipsIncorrect = [
  "It looks like you're not getting points. Would you like help with that?",
  "It looks like you guessed. I have no further comment.",
  "No points awarded. It looks like you'd like to try a different strategy.",
  "It looks like the correct answer escaped you. Shall I find it?",
  "It looks like you're building character.",
  "It looks like that one got away. I've seen worse. Not often, but I've seen it.",
  "No points. It looks like you'd like to move on. I recommend it.",
  "Answer not detected as correct. Recalibrating expectations...",
  "It looks like you'd benefit from a hint. Unfortunately the round is over.",
  "It looks like the answer surprised you too.",
  "It looks like you're familiar with the topic. Just not that specific part.",
  "It looks like a wrong answer. I could be wrong. I'm not.",
  "It looks like someone would like a do-over. [Yes] [No] [Please]",
  "It looks like the points went elsewhere. As they do.",
  "Wrong answer logged. It happens to the best of us. Just not usually this often.",
];

let clippyCooldown = 2;

function maybeShowClippy(correct) {
  if (clippyCooldown > 0) { clippyCooldown--; return; }
  if (Math.random() < 0.5) {
    const pool = correct ? clippyQuipsCorrect : clippyQuipsIncorrect;
    const quip = pool[Math.floor(Math.random() * pool.length)];
    document.getElementById('clippy-bubble').textContent = quip;
    document.getElementById('clippy-wrap').classList.add('visible');
    clippyCooldown = 2;
  }
}

function hideClippy() {
  document.getElementById('clippy-wrap').classList.remove('visible');
}

document.addEventListener('contextmenu', e => {
  if (e.target.closest('#clippy-wrap')) {
    e.preventDefault();
    hideClippy();
  }
});
