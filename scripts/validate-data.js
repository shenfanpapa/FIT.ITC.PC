const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'roomcheck.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.inspectionState && (typeof data.inspectionState !== 'object' || Array.isArray(data.inspectionState))) {
  throw new Error('inspectionState must be an object');
}
const roomNames = Object.keys(data.rooms || {});
const errors = [];
let deviceCount = 0;
let groupCount = 0;
const allIds = new Set();

for (const room of roomNames) {
  const devices = data.rooms[room];
  if (!Array.isArray(devices)) {
    errors.push(`${room}: devices must be an array`);
    continue;
  }
  deviceCount += devices.length;
  const ids = new Set();
  for (const device of devices) {
    if (!device.id || ids.has(device.id)) errors.push(`${room}: duplicate or missing device id`);
    ids.add(device.id);
    allIds.add(device.id);
    for (const key of ['x', 'y', 'w', 'h']) {
      if (!Number.isFinite(device[key])) errors.push(`${room}/${device.id}: invalid ${key}`);
    }
  }
  for (const group of data.groups?.[room] || []) {
    groupCount += 1;
    for (const id of group.deviceIds || []) {
      if (!ids.has(id)) errors.push(`${room}/${group.name}: unknown device ${id}`);
    }
  }
}

for (const room of data.roomOrder || []) {
  if (!data.rooms?.[room]) errors.push(`roomOrder: unknown room ${room}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${roomNames.length} rooms, ${deviceCount} devices and ${groupCount} groups.`);
