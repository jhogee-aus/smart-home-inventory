// Builds the distributable installer with backend/electron source obfuscated
// for the shipped app, while leaving the git-tracked source readable.
//
// The frontend bundle obfuscates itself as part of `frontend`'s own build
// script (frontend/obfuscate.cjs) since dist/ is already a disposable build
// artifact. backend/ and electron/ have no such split — the source *is*
// what ships — so this script obfuscates those files in place, packages
// the app, then always restores the originals, success or failure.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const root = path.join(__dirname, '..');

const targets = [
  'backend/server.js',
  'backend/db/db.js',
  'backend/controllers/homesController.js',
  'backend/controllers/roomsController.js',
  'backend/controllers/zonesController.js',
  'backend/controllers/itemsController.js',
  'backend/controllers/searchController.js',
  'backend/routes/homes.js',
  'backend/routes/rooms.js',
  'backend/routes/zones.js',
  'backend/routes/items.js',
  'backend/routes/search.js',
  'electron/main.js',
  'electron/preload.js',
].map((p) => path.join(root, p));

const options = {
  target: 'node',
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  numbersToExpressions: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  transformObjectKeys: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
};

function obfuscate() {
  const backups = new Map();

  for (const file of targets) {
    const source = fs.readFileSync(file, 'utf8');
    backups.set(file, source);
    const result = JavaScriptObfuscator.obfuscate(source, options);
    fs.writeFileSync(file, result.getObfuscatedCode(), 'utf8');
    console.log(`[obfuscate] ${path.relative(root, file)}`);
  }

  return backups;
}

function restore(backups) {
  for (const [file, source] of backups) {
    fs.writeFileSync(file, source, 'utf8');
  }
  console.log(`[restore] ${backups.size} file(s) restored to readable source`);
}

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
}

let backups;
try {
  backups = obfuscate();

  run('npm', ['run', 'build:frontend']);
  run('npx', ['electron-builder', '--win']);

  console.log('[build-release] done — installer is in release/');
} finally {
  if (backups) restore(backups);
}
