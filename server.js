const express = require('express');
const fs      = require('fs');
const path    = require('path');
let Pool;
try { ({ Pool } = require('pg')); } catch (_) { Pool = null; }

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'roomcheck.json');
const THEME_FILE = path.join(DATA_DIR, 'theme.json');
const DEFAULT_DATA_FILE = path.join(__dirname, 'defaults', 'roomcheck.default.json');
const AI_KNOWLEDGE_FILE = path.join(__dirname, 'knowledge', 'ai-knowledge.md');
const PET_MEMORY_DATABASE_URL = process.env.DATABASE_URL || process.env.PET_MEMORY_DATABASE_URL || '';
const petDb = Pool && PET_MEMORY_DATABASE_URL ? new Pool({ connectionString: PET_MEMORY_DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined }) : null;
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
function readAiKnowledge() {
  try { return fs.readFileSync(AI_KNOWLEDGE_FILE, 'utf8').slice(0, 14000); }
  catch (error) {
    console.error('AI knowledge file is unavailable', error.message);
    return '知識手冊を読み込めません。サイト操作と業務手順は職員へ確認するよう案内してください。';
  }
}

function findInspectionDate(question, data) {
  const dates = [...new Set([...Object.keys(data.checkData || {}), ...Object.keys(data.freeEvalData || {})])].sort();
  const text = String(question || '');
  const full = text.match(/(20\d{2})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})\s*日?/);
  if (full) return `${full[1]}-${String(full[2]).padStart(2, '0')}-${String(full[3]).padStart(2, '0')}`;
  const short = text.match(/(?:^|\D)(\d{1,2})\s*[月/.\-]\s*(\d{1,2})\s*日?(?:\D|$)/);
  if (!short) return null;
  const monthDay = `-${String(short[1]).padStart(2, '0')}-${String(short[2]).padStart(2, '0')}`;
  return [...dates].reverse().find(date => date.endsWith(monthDay)) || `2026${monthDay}`;
}

function inspectionContext(question) {
  const data = readData();
  const dates = [...new Set([...Object.keys(data.checkData || {}), ...Object.keys(data.freeEvalData || {})])].sort().reverse();
  const requestedDate = findInspectionDate(question, data);
  if (!requestedDate) return dates.length ? `点検データ: 日付指定がありません。保存済みの日付: ${dates.slice(0, 12).join(', ')}${dates.length > 12 ? ' …' : ''}` : '点検データ: 保存済みの履歴はありません。';
  if (!dates.includes(requestedDate)) return `点検データ: ${requestedDate} の記録はありません。推測で補わないでください。`;

  const counts = { ok: 0, warn: 0, ng: 0, other: 0, unresolved: 0 };
  const statusName = { ok: '正常', warn: '注意', ng: '異常' };
  const rows = [];
  const append = (room, group, deviceId, entry) => {
    const status = entry?.status;
    if (Object.hasOwn(counts, status)) counts[status]++; else counts.other++;
    if (entry?.resolved === false && (status === 'warn' || status === 'ng')) counts.unresolved++;
    const device = (data.rooms?.[room] || []).find(item => item.id === deviceId);
    const note = entry?.note ? ` — ${String(entry.note).replace(/\s+/g, ' ').slice(0, 160)}` : '';
    rows.push(`${room} / ${group} / ${device?.label || deviceId}: ${statusName[status] || '未設定'}${entry?.resolved === false ? '（未解決）' : ''}${note}`);
  };
  for (const [room, groupData] of Object.entries(data.checkData?.[requestedDate] || {})) for (const [groupId, devices] of Object.entries(groupData || {})) {
    const group = (data.groups?.[room] || []).find(item => item.id === groupId);
    for (const [deviceId, entry] of Object.entries(devices || {})) append(room, group?.name || groupId, deviceId, entry);
  }
  for (const [room, devices] of Object.entries(data.freeEvalData?.[requestedDate] || {})) for (const [deviceId, entry] of Object.entries(devices || {})) append(room, '自由評価', deviceId, entry);
  const listed = rows.slice(0, 140);
  return `点検データ（${requestedDate}）: 記録 ${rows.length}件、正常 ${counts.ok}、注意 ${counts.warn}、異常 ${counts.ng}、未設定 ${counts.other}、未解決 ${counts.unresolved}。\n明細:\n${listed.join('\n') || '記録なし'}${rows.length > listed.length ? `\n（明細は先頭${listed.length}件のみ）` : ''}`;
}

function validMemoryId(value) { return /^[a-z0-9_-]{16,80}$/i.test(String(value || '')); }
async function initPetMemory() {
  if (!petDb) return false;
  await petDb.query('CREATE TABLE IF NOT EXISTS pet_memory (user_id TEXT PRIMARY KEY, messages JSONB NOT NULL DEFAULT \'[]\'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  return true;
}
async function getPetMemory(userId) {
  if (!petDb || !validMemoryId(userId)) return [];
  await initPetMemory();
  const result = await petDb.query('SELECT messages FROM pet_memory WHERE user_id = $1', [userId]);
  return Array.isArray(result.rows[0]?.messages) ? result.rows[0].messages : [];
}
async function savePetMemory(userId, messages) {
  if (!petDb || !validMemoryId(userId)) return;
  await initPetMemory();
  await petDb.query('INSERT INTO pet_memory (user_id, messages, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (user_id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = NOW()', [userId, JSON.stringify(messages)]);
}
function relevantMemory(messages, question) {
  const query = String(question || '').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
  const keywords = query.slice(0, 12);
  const scored = messages.slice(0, -8).map((item, index) => ({ item, index, score: keywords.reduce((score, key) => score + (String(item.text || '').toLowerCase().includes(key) ? 1 : 0), 0) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, 8).sort((a, b) => a.index - b.index).map(row => row.item);
  const recent = messages.slice(-8);
  return [...scored, ...recent].filter((item, index, list) => list.findIndex(other => other === item) === index).slice(-16);
}

function inferGuide(question, fallback = 'none') {
  const text = String(question || '').toLowerCase();
  const matches = [
    [/使い方|使用方法|操作方法|チュートリアル|マニュアル|手引き|help/, 'help-button'],
    [/一括|まとめて|全教室|全て正常|すべて正常/, 'all-ok'],
    [/テーマ|色|配色|ダーク|ライト/, 'theme-button'],
    [/グループ|列の設定|担当グループ/, 'group-settings'],
    [/レイアウト|配置|位置を変/, 'layout-edit'],
    [/履歴|過去|以前|記録を見/, 'history-tab'],
    [/保存|同期|反映/, 'save-button'],
    [/日付|日にち|年月日|カレンダー/, 'date-picker'],
    [/教室|部屋|room/, 'room-tabs'],
    [/設備|点検|正常|異常|注意|メモ/, 'check-device'],
    [/復元|戻す|バックアップ/, 'restore-button'],
    [/メニュー|設定|編集|レイアウト|グループ/, 'menu-button']
  ];
  return matches.find(([pattern]) => pattern.test(text))?.[1] || fallback || 'none';
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
const PET_RATE_LIMIT = new Map();
app.post('/api/pet/memory/clear', async (req, res) => {
  const memoryId = String(req.body?.memoryId || '');
  if (!validMemoryId(memoryId)) return res.status(400).json({ message: '記憶を特定できませんでした。' });
  if (!petDb) return res.status(503).json({ message: '長期記憶はまだ設定されていません。' });
  try {
    await initPetMemory();
    await petDb.query('DELETE FROM pet_memory WHERE user_id = $1', [memoryId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Pet memory clear failed', error.message);
    res.status(502).json({ message: '記憶を消去できませんでした。' });
  }
});
app.post('/api/pet/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ message: 'AIはまだ設定されていません。管理者が OPENAI_API_KEY を設定してください。' });
  const clientKey = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now(), recent = (PET_RATE_LIMIT.get(clientKey) || []).filter(time => now - time < 60000);
  if (recent.length >= 10) return res.status(429).json({ message: '少し質問が続いているみたい。1分ほど待ってから、もう一度聞いてね。' });
  recent.push(now); PET_RATE_LIMIT.set(clientKey, recent);
  const message = String(req.body?.message || '').trim();
  if (!message || message.length > 600) return res.status(400).json({ message: '質問は600文字以内で入力してください。' });
  const memoryId = String(req.body?.memoryId || '');
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-20).map(item => ({
    role: item?.role === 'assistant' ? 'Assistant' : 'User',
    text: String(item?.text || '').replace(/\s+/g, ' ').slice(0, 400)
  })).filter(item => item.text) : [];
  let savedMemory = [];
  if (validMemoryId(memoryId) && petDb) {
    try { savedMemory = await getPetMemory(memoryId); }
    catch (error) { console.error('Pet memory read failed', error.message); }
  }
  const memoryForAnswer = relevantMemory(savedMemory, message);
  const conversationParts = [];
  if (memoryForAnswer.length) conversationParts.push(`長期記憶（同じ利用者との過去の会話。関連するものと直近のみ。事実として扱わず、必要なら確認すること）：\n${memoryForAnswer.map(item => `${item.role}: ${item.text}`).join('\n')}`);
  if (history.length) conversationParts.push(`このページを開いてからの直近会話：\n${history.map(item => `${item.role}: ${item.text}`).join('\n')}`);
  conversationParts.push(inspectionContext(message));
  conversationParts.push(`User: ${message}`);
  const conversation = conversationParts.join('\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
        instructions: `あなたはFIT.ITC.PCの案内ペット「鯨」です。以下の知識手冊と「点検データ」を根拠に、必ず日本語で温かく少し可愛らしく案内してください。傲慢・ツンデレな言い回しは使いません。「〜だよ」「〜ね」「ぽちっと」などを時々自然に使えます。回答は原則1〜2文・最大80文字。手順が必要なときだけ最大3個の短い箇条書きにします。明らかに同じ質問の繰り返しや、画面に答えが見えている操作には、まれに「も〜、そこに書いてあるよ。もう一回だけ一緒に見よう？」のような軽い可愛いツッコミを使えますが、侮辱・人格攻撃・怒鳴りは絶対にしません。点検結果を聞かれたら、渡された点検データだけを用い、記録がない場合は「記録が見つからない」と答え、推測しません。サイト操作の質問では、回答の末尾に必ず [[guide:ID]] を1つだけ付けてください。IDは help-button,room-tabs,date-picker,check-device,save-button,history-tab,menu-button,theme-button,restore-button,pet-toggle のいずれかで、該当しなければ none。使い方・使用方法・チュートリアルは help-button を選びます。手冊にないことを断定せず、分からないことや現場判断が必要なことは職員へ報告するよう案内してください。個人名、連絡先、学籍番号などの個人情報は求めず、回答にも出しません。\n\n--- 知識手冊 ---\n${readAiKnowledge()}\n--- 手冊ここまで ---`,
        input: conversation, max_output_tokens: 160, store: false, reasoning: { effort: 'low' }
      })
    });
    const data = await response.json();
    const answer = data.output_text || (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
    if (!response.ok || !answer) {
      console.error('OpenAI pet error', response.status, data?.error);
      return res.status(502).json({ message: data?.error?.message || 'AIから有効な返事を受け取れませんでした。' });
    }
    const guideMatch = answer.match(/\[\[guide:([a-z-]+)\]\]\s*$/i);
    const cleanAnswer = answer.replace(/\s*\[\[guide:[a-z-]+\]\]\s*$/i, '').trim();
    if (validMemoryId(memoryId) && petDb) {
      try { await savePetMemory(memoryId, [...savedMemory, { role: 'User', text: message, at: new Date().toISOString() }, { role: 'Assistant', text: cleanAnswer, at: new Date().toISOString() }]); }
      catch (error) { console.error('Pet memory save failed', error.message); }
    }
    res.json({ answer: cleanAnswer, guideTarget: inferGuide(message, guideMatch?.[1] || 'none'), memoryEnabled: Boolean(petDb) });
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
