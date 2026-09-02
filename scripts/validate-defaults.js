const fs = require('fs');
const path = require('path');

const expectedVersion = 'corrected-2026-09-02';
const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'defaults', 'roomcheck.default.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'roomcheck.json'), 'utf8'));
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

if (defaults.coordinateSetVersion !== expectedVersion || seed.coordinateSetVersion !== expectedVersion) {
  throw new Error('Corrected coordinate version is missing');
}
if (JSON.stringify(defaults.rooms) !== JSON.stringify(seed.rooms)) {
  throw new Error('Seed rooms differ from the immutable coordinate defaults');
}
if (JSON.stringify(defaults.groups) !== JSON.stringify(seed.groups)) {
  throw new Error('Seed groups differ from the immutable coordinate defaults');
}

const deviceCount = Object.values(defaults.rooms).reduce((sum, devices) => sum + devices.length, 0);
if (deviceCount !== 900) throw new Error(`Expected 900 default devices, got ${deviceCount}`);

const enlarged = defaults.rooms?.B24?.find(device => device.label === '71-167');
if (!enlarged || enlarged.x !== 232 || enlarged.y !== 480 || enlarged.w !== 112 || enlarged.h !== 80) {
  throw new Error('B24 71-167 corrected coordinates or enlarged dimensions are missing');
}

for (const required of ['CURRENT_COORDINATE_SET', 'migrateToDefaultCoordinates', 'DEFAULT_DATA_FILE']) {
  if (!server.includes(required)) throw new Error(`Server is missing default migration hook: ${required}`);
}

console.log(`Corrected defaults validated: ${Object.keys(defaults.rooms).length} rooms, ${deviceCount} devices, B24 71-167 at (232,480) 112x80.`);
