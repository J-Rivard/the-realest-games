// ── FIREBASE CONFIG ────────────────────────────────────
// Setup steps:
//   1. Go to https://console.firebase.google.com
//   2. Create a project → Add a web app → copy config values below
//   3. Go to Build → Realtime Database → Create database (start in test mode)
//   4. Replace every 'YOUR_...' value with your actual config
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyA3NaSF6IVOCttYSJV7nbTTBplh14QiyOc',
  authDomain:        'realest-trivia.firebaseapp.com',
  databaseURL:       'https://realest-trivia-default-rtdb.firebaseio.com',
  projectId:         'realest-trivia',
  storageBucket:     'realest-trivia.firebasestorage.app',
  messagingSenderId: '26095770191',
  appId:             '1:26095770191:web:d8eab61a9339118106e83a'
};

let _db = null;

function initFirebase() {
  if (_db) return true;
  if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) {
    console.info('[Firebase] Config not set — multiplayer disabled.');
    return false;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.database();
    return true;
  } catch (e) {
    console.warn('[Firebase] Init failed:', e);
    return false;
  }
}

function generateRoomCode() {
  return 'OTR-' + String(Math.floor(1000 + Math.random() * 9000));
}

function roomRef(code) {
  return _db.ref('rooms/' + code);
}

async function fbCreateRoom(code, data) {
  await roomRef(code).set(data);
}

async function fbDeleteRoom(code) {
  try { await roomRef(code).remove(); } catch (e) {}
}

async function fbRoomExists(code) {
  const snap = await roomRef(code).once('value');
  return snap.exists();
}

async function fbGetRoom(code) {
  const snap = await roomRef(code).once('value');
  return snap.val();
}

function fbSubscribeRoom(code, callback) {
  const ref = roomRef(code);
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off('value');
}

async function fbUpdateModal(code, modalData) {
  await roomRef(code).child('modal').set(modalData);
}

async function fbUpdateState(code, stateData) {
  await roomRef(code).update(stateData);
}

async function fbAddPlayer(code, playerId, data) {
  await roomRef(code).child('players').child(playerId).set(data);
}

async function fbRemovePlayer(code, playerId) {
  await roomRef(code).child('players').child(playerId).remove();
}

async function fbBuzz(code, playerId, playerName) {
  const ref = roomRef(code).child('buzzer');
  await ref.transaction(current => {
    if (current === null) return { playerId, playerName, buzzedAt: Date.now() };
    return undefined; // abort if already set
  });
}

async function fbClearBuzzer(code) {
  await roomRef(code).child('buzzer').set(null);
}
