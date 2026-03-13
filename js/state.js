// ── STATE ─────────────────────────────────────────────
let questions = [];
let categories = [];
let byCategory = {};
let done = new Set();
let dailyDoubles = new Set();

let currentKey = null;
let currentPoints = 0;
let isDailyDouble = false;
let currentWager = 0;
let currentWagerPlayerIdx = null;

let players = [];
let selectedPlayer = null;
let isFinalInCategory = false;
let swapPlayers = new Set();
let history = [];
let resetTargetKey = null;

// ── MULTIPLAYER STATE ──────────────────────────────────
let isHosting = false;
let isViewing = false;
let currentRoomCode = null;
let viewerUnsubscribe = null;
