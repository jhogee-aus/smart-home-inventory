const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const assetsDir = path.join(__dirname, 'dist', 'assets');

const options = {
  target: 'browser',
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

if (!fs.existsSync(assetsDir)) {
  console.error('[obfuscate] dist/assets not found — run `vite build` first');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

if (files.length === 0) {
  console.warn('[obfuscate] no .js files found in dist/assets');
}

for (const file of files) {
  const filePath = path.join(assetsDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(source, options);
  fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
  console.log(`[obfuscate] ${file}`);
}
