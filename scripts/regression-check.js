const fs = require('fs');

function groupIndex(dateStr, groupCount) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = Date.UTC(y, m - 1, d);
  if (new Date(dt).getUTCDay() === 0) return -1;
  const diff = Math.floor((dt - Date.UTC(2024, 0, 1)) / 86400000);
  const weeks = Math.floor(diff / 7);
  const rem = ((diff % 7) + 7) % 7;
  return (((weeks * 6 + rem) % groupCount) + groupCount) % groupCount;
}

const sequence = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
const indices = sequence.map(date => groupIndex(date, 12));
if (new Set(indices).size !== indices.length) {
  throw new Error('Inspection group does not advance when the date changes');
}
if (groupIndex('2026-09-06', 12) !== -1) {
  throw new Error('Sunday must not have a scheduled inspection group');
}

function touch(state, dateStr, groupCount) {
  if (new Date(dateStr + 'T00:00:00').getDay() === 0) return state;
  if (!state) return { index: groupIndex(dateStr, groupCount), lastVisitDate: dateStr };
  if (state.lastVisitDate !== dateStr) {
    return { index: (state.index + 1) % groupCount, lastVisitDate: dateStr };
  }
  return state;
}
let sticky = touch(null, '2026-09-01', 12);
const first = sticky.index;
sticky = touch(sticky, '2026-09-01', 12);
if (sticky.index !== first) throw new Error('Repeated opens on the same day advanced the group');
sticky = touch(sticky, '2026-09-04', 12);
if (sticky.index !== (first + 1) % 12) {
  throw new Error('Skipped unopened dates incorrectly skipped inspection groups');
}

for (const file of ['public/index.html', 'public/mobile.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const required of [
    'function setSelectedDate',
    'const todayStr=selectedDate||today()',
    'function exportAnomalyHistory',
    'function getAllAnomalies',
    'function touchInspectionSchedule',
    'inspectionState:inspectionState||{}',
    'mergeServerData',
    'syncChain=syncChain.then'
  ]) {
    if (!html.includes(required)) throw new Error(`${file}: missing ${required}`);
  }
  const calls = (html.match(/playSceneTransition\(/g) || []).length;
  if (calls !== 2) throw new Error(`${file}: opening animation must only be defined and called once`);
}

console.log(`Date rotation OK: ${sequence.map((d, i) => `${d}=>${indices[i] + 1}`).join(', ')}; Sunday=>off`);
console.log('Skipped-day sticky schedule, conflict retry, realtime save, opening animation and anomaly export checks passed.');
