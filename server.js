const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'roomcheck.json');
const THEME_FILE = path.join(DATA_DIR, 'theme.json');
const DEFAULT_DATA_FILE = path.join(__dirname, 'defaults', 'roomcheck.default.json');
const CURRENT_COORDINATE_SET = 'corrected-2026-09-02';

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readDefaultData() {
  return JSON.parse(fs.readFileSync(DEFAULT_DATA_FILE, 'utf8'));
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function migrateToDefaultCoordinates(current) {
  const defaults = readDefaultData();
  const deviceMaps = {};
  const groupMaps = {};

  for (const [room, defaultDevices] of Object.entries(defaults.rooms || {})) {
    const defaultIds = new Set(defaultDevices.map(d => d.id));
    const byIdentity = new Map(defaultDevices.map(d => [`${d.type}|${d.label}|${d.pc || ''}|${d.monitor || ''}`, d.id]));
    deviceMaps[room] = {};
    for (const device of current.rooms?.[room] || []) {
      const key = `${device.type}|${device.label}|${device.pc || ''}|${device.monitor || ''}`;
      const mapped = defaultIds.has(device.id) ? device.id : byIdentity.get(key);
      if (mapped) deviceMaps[room][device.id] = mapped;
    }

    const defaultGroups = defaults.groups?.[room] || [];
    const defaultGroupIds = new Set(defaultGroups.map(g => g.id));
    const byName = new Map(defaultGroups.map(g => [g.name, g.id]));
    groupMaps[room] = {};
    for (const group of current.groups?.[room] || []) {
      const mapped = defaultGroupIds.has(group.id) ? group.id : byName.get(group.name);
      if (mapped) groupMaps[room][group.id] = mapped;
    }
  }

  const checkData = clone(defaults.checkData || {});
  for (const [date, roomData] of Object.entries(current.checkData || {})) {
    for (const [room, groupData] of Object.entries(roomData || {})) {
      if (!defaults.rooms?.[room]) continue;
      for (const [oldGroupId, deviceData] of Object.entries(groupData || {})) {
        const groupId = groupMaps[room]?.[oldGroupId];
        if (!groupId) continue;
        for (const [oldDeviceId, entry] of Object.entries(deviceData || {})) {
          const deviceId = deviceMaps[room]?.[oldDeviceId];
          if (!deviceId) continue;
          checkData[date] ||= {};
          checkData[date][room] ||= {};
          checkData[date][room][groupId] ||= {};
          checkData[date][room][groupId][deviceId] = entry;
        }
      }
    }
  }

  const freeEvalData = clone(defaults.freeEvalData || {});
  for (const [date, roomData] of Object.entries(current.freeEvalData || {})) {
    for (const [room, deviceData] of Object.entries(roomData || {})) {
      if (!defaults.rooms?.[room]) continue;
      for (const [oldDeviceId, entry] of Object.entries(deviceData || {})) {
        const deviceId = deviceMaps[room]?.[oldDeviceId];
        if (!deviceId) continue;
        freeEvalData[date] ||= {};
        freeEvalData[date][room] ||= {};
        freeEvalData[date][room][deviceId] = entry;
      }
    }
  }

  const inspectionState = {};
  for (const [room, state] of Object.entries(current.inspectionState || {})) {
    const groupId = groupMaps[room]?.[state.groupId];
    if (!groupId) continue;
    const assignments = {};
    for (const [date, oldGroupId] of Object.entries(state.assignments || {})) {
      const mapped = groupMaps[room]?.[oldGroupId];
      if (mapped) assignments[date] = mapped;
    }
    inspectionState[room] = { ...state, groupId, assignments };
  }

  return {
    ...current,
    rooms: clone(defaults.rooms || {}),
    groups: clone(defaults.groups || {}),
    checkData,
    freeEvalData,
    inspectionState,
    roomOrder: clone(defaults.roomOrder || Object.keys(defaults.rooms || {})),
    coordinateSetVersion: CURRENT_COORDINATE_SET,
    revision: (current.revision || 0) + 1,
    migratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
function readData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = readDefaultData();
    seeded.coordinateSetVersion = CURRENT_COORDINATE_SET;
    seeded.revision = 0;
    seeded.updatedAt = new Date().toISOString();
    writeData(seeded);
    return seeded;
  }
  const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (current.coordinateSetVersion !== CURRENT_COORDINATE_SET) {
    const migrated = migrateToDefaultCoordinates(current);
    writeData(migrated);
    return migrated;
  }
  return current;
}
function writeData(d) {
  ensureDir();
  const tmp = `${DATA_FILE}.tmp`;
  const backup = `${DATA_FILE}.bak`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, backup);
  fs.renameSync(tmp, DATA_FILE);
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
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json({ ...data, revision: data.revision || 0 });
});

// POST /api/data — 全データ保存（freeEvalData含む）
app.post('/api/data', (req, res) => {
  const { rooms, groups, checkData, freeEvalData, inspectionState, roomOrder, revision } = req.body;
  if (!rooms || typeof rooms !== 'object' || Array.isArray(rooms)) {
    return res.status(400).json({ error: 'invalid payload' });
  }
  const current = readData();
  const currentRevision = current.revision || 0;
  if (revision !== undefined && revision !== currentRevision) {
    return res.status(409).json({ error: 'data_conflict', revision: currentRevision });
  }
  const nextRevision = currentRevision + 1;
  writeData({
    rooms,
    groups: groups||{},
    checkData: checkData||{},
    freeEvalData: freeEvalData||{},
    inspectionState: inspectionState||{},
    roomOrder: roomOrder||[],
    coordinateSetVersion: current.coordinateSetVersion || CURRENT_COORDINATE_SET,
    revision: nextRevision,
    updatedAt: new Date().toISOString()
  });
  res.json({ ok: true, revision: nextRevision, savedAt: new Date().toISOString() });
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
  const snapFile = path.join(DATA_DIR, 'snapshot.json');
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
  const snapFile = path.join(DATA_DIR, 'snapshot.json');
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
  const snapFile = path.join(DATA_DIR, 'snapshot.json');
  try {
    const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    const currentRevision = readData().revision || 0;
    writeData({ rooms: snap.rooms||{}, groups: snap.groups||{}, checkData: snap.checkData||{}, freeEvalData: snap.freeEvalData||{}, inspectionState: snap.inspectionState||{}, roomOrder: snap.roomOrder||[], coordinateSetVersion: snap.coordinateSetVersion||'', revision: currentRevision + 1, updatedAt: new Date().toISOString() });
    const restored = readData();
    res.json({ ok: true, savedAt: snap.savedAt, revision: restored.revision });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PC_CHAT_PASSWORD = process.env.PET_CHAT_PASSWORD || '';
app.post('/api/pet/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY || !PC_CHAT_PASSWORD) {
    return res.status(503).json({ message: 'AIはまだ設定されていません。管理者が OPENAI_API_KEY と PET_CHAT_PASSWORD を設定してください。' });
  }
  if (String(req.body?.password || '') !== PC_CHAT_PASSWORD) {
    return res.status(401).json({ message: '合言葉が違うみたいです。もう一度お願いします。' });
  }
  const message = String(req.body?.message || '').trim();
  if (!message || message.length > 600) return res.status(400).json({ message: '質問は600文字以内で入力してください。' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: 'あなたはFIT.ITC.PCの案内ペット「鯨」です。日本語で、丁寧で少しだけツンとした可愛い口調で答えます。サイトの点検、履歴、グループ、レイアウト、テーマ、復元の使い方を短い手順で案内します。個人名、連絡先、学籍番号などの個人情報は扱わず、分からない内容は職員へ報告するよう案内してください。',
        input: message, max_output_tokens: 400, store: false
      })
    });
    const data = await response.json();
    const answer = data.output_text || (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
    if (!response.ok || !answer) {
      console.error('OpenAI pet error', response.status, data?.error);
      return res.status(502).json({ message: data?.error?.message || 'AIから有効な返事を受け取れませんでした。' });
    }
    res.json({ answer });
  } catch (error) {
    console.error('OpenAI pet request failed', error);
    res.status(502).json({ message: error.name === 'AbortError' ? 'AIの応答がタイムアウトしました。' : 'AIに接続できませんでした。' });
  } finally {
    clearTimeout(timeout);
  }
});

app.get('*', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  res.sendFile(path.join(__dirname, 'public', isMobile(ua) ? 'mobile.html' : 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => console.log(`RoomCheck running on port ${PORT}`));
const PC_PASS=process.env.PET_CHAT_PASSWORD||'',PC_USE=new Map();function pcDateSummary(d,date){let c={ok:0,ng:0,warn:0},issues=[];for(const[room,gs]of Object.entries(d.checkData?.[date]||{}))for(const[gid,es]of Object.entries(gs||{}))for(const[id,e]of Object.entries(es||{})){if(e.status==='ok')c.ok++;else if(e.status==='ng')c.ng++;else if(e.status==='warn')c.warn++;if((e.status==='ng'||e.status==='warn')&&issues.length<10)issues.push({room,device:(d.rooms?.[room]||[]).find(x=>x.id===id)?.label||id,status:e.status,note:String(e.note||'').slice(0,100)})}return{date,counts:c,issues}};app.post('/api/pet/chat',async(q,z)=>{if(!process.env.OPENAI_API_KEY||!PC_PASS)return z.status(503).json({message:'AIはまだ設定されていません。'});if(q.get('x-pet-password')!==PC_PASS)return z.status(401).json({message:'合言葉が違うみたいです。もう一度お願いします。'});let m=String(q.body?.message||'').trim();if(!m||m.length>600)return z.status(400).json({message:'質問は600文字以内で入力してください。'});try{let r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.4-mini',instructions:'あなたはFIT.ITC.PCの案内ペット「鯨」です。日本語で、丁寧で少しだけツンとした可愛い口調で答えます。サイトの点検、履歴、グループ、レイアウト、テーマ、復元の使い方を短い手順で案内します。業務ガイドでは清掃、機器確認、学生対応、忘れ物、施錠消灯、Teams報告を説明できます。個人名、連絡先、学籍番号などの個人情報は扱いません。分からない内容は職員へ報告するよう案内してください。',input:m+(()=>{let d=m.match(/20\d{2}-\d{2}-\d{2}/)?.[0];return d?'\\n\\n点検履歴（読み取り専用）:'+JSON.stringify(pcDateSummary(readData(),d)):''})(),max_output_tokens:400,store:false,reasoning:{effort:'none'}})}),j=await r.json(),a=j.output_text||(j.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');if(!r.ok||!a){console.error('OpenAI pet error',r.status,j?.error);throw 0};z.json({answer:a,remaining:null})}catch(e){z.status(502).json({message:'AIは今うまく返事できません。少し待ってください。'})}});
