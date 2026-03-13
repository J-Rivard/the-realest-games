// ── FIREBASE CONFIG ────────────────────────────────────
// Setup steps:
//   1. Go to https://console.firebase.google.com
//   2. Create a project → Add a web app → copy config values below
//   3. Go to Build → Realtime Database → Create database (start in test mode)
//   4. Replace every 'YOUR_...' value with your actual config
const FIREBASE_CONFIG = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID'
};

let _db = null;

function initFirebase() {
  if (_db) return true;
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
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

function _roomRef(code) {
  return _db.ref('rooms/' + code);
}

async function fbCreateRoom(code, data) {
  await _roomRef(code).set(data);
}

async function fbDeleteRoom(code) {
  try { await _roomRef(code).remove(); } catch (e) {}
}

async function fbRoomExists(code) {
  const snap = await _roomRef(code).once('value');
  return snap.exists();
}

function fbSubscribeRoom(code, callback) {
  const ref = _roomRef(code);
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off('value');
}

async function fbUpdateModal(code, modalData) {
  await _roomRef(code).child('modal').set(modalData);
}

async function fbUpdateState(code, stateData) {
  await _roomRef(code).update(stateData);
}
