const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE  = path.join(__dirname, 'data', 'roomcheck.json');
const THEME_FILE = path.join(__dirname, 'data', 'theme.json');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function readData() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) { return { rooms:{}, groups:{}, checkData:{}, freeEvalData:{}, roomOrder:[] }; }
}
function writeData(d) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}
function readTheme() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(THEME_FILE, 'utf8')); }
  catch(e) { return null; }
}
function writeTheme(t) {
  ensureDir();
  fs.writeFileSync(THEME_FILE, JSON.stringify(t, null, 2));
}
function isMobile(ua) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  res.sendFile(path.join(__dirname, 'public', isMobile(ua) ? 'mobile.html' : 'index.html'));
});

// GET /api/data — 全データ返す
app.get('/api/data', (req, res) => res.json(readData()));

// POST /api/data — 全データ保存（freeEvalData含む）
app.post('/api/data', (req, res) => {
  const { rooms, groups, checkData, freeEvalData, roomOrder } = req.body;
  if (!rooms) return res.status(400).json({ error: 'invalid payload' });
  writeData({
    rooms,
    groups: groups||{},
    checkData: checkData||{},
    freeEvalData: freeEvalData||{},
    roomOrder: roomOrder||[]
  });
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.get('/api/theme', (req, res) => {
  const t = readTheme();
  res.json(t ? { ok: true, theme: t } : { ok: false });
});
app.post('/api/theme', (req, res) => {
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'invalid payload' });
  writeTheme(theme);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Aliases for restore-point (same as snapshot)
app.get('/api/restore-point', (req, res) => res.redirect('/api/snapshot'));
app.post('/api/restore-point/save', (req, res) => res.redirect(307, '/api/snapshot/save'));
app.post('/api/restore-point/restore', (req, res) => res.redirect(307, '/api/snapshot/restore'));

// GET /api/snapshot - get snapshot info
app.get('/api/snapshot', (req, res) => {
  ensureDir();
  const snapFile = path.join(__dirname, 'data', 'snapshot.json');
  try {
    const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    res.json({ ok: true, savedAt: snap.savedAt, roomCount: Object.keys(snap.rooms||{}).length });
  } catch(e) {
    res.json({ ok: false });
  }
});

// POST /api/snapshot/save - save current data as snapshot
app.post('/api/snapshot/save', (req, res) => {
  ensureDir();
  const snapFile = path.join(__dirname, 'data', 'snapshot.json');
  try {
    const current = readData();
    current.savedAt = new Date().toISOString();
    fs.writeFileSync(snapFile, JSON.stringify(current, null, 2));
    res.json({ ok: true, savedAt: current.savedAt });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/snapshot/restore - restore snapshot to main data
app.post('/api/snapshot/restore', (req, res) => {
  ensureDir();
  const snapFile = path.join(__dirname, 'data', 'snapshot.json');
  try {
    const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    writeData({ rooms: snap.rooms||{}, groups: snap.groups||{}, checkData: snap.checkData||{}, freeEvalData: snap.freeEvalData||{}, roomOrder: snap.roomOrder||[] });
    res.json({ ok: true, savedAt: snap.savedAt });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  res.sendFile(path.join(__dirname, 'public', isMobile(ua) ? 'mobile.html' : 'index.html'));
});

app.listen(PORT, () => console.log(`RoomCheck running on port ${PORT}`));
