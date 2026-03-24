#!/usr/bin/env node
/**
 * release.js — Build portable .exe, push to GitHub, upload as release asset
 *
 * Usage:
 *   node release.js              — bump patch, build exe, push, release
 *   node release.js 0.3.0       — set exact version
 *   node release.js minor        — bump minor
 *   node release.js major        — bump major
 *   node release.js patch        — bump patch
 *
 * Requires: git, gh (GitHub CLI), npm, electron-builder
 *
 * What it does:
 *   1. Bumps version in package.json + ngames.manifest.json
 *   2. Builds BlacksArena-portable.exe via electron-builder
 *   3. Commits, tags, pushes source to GitHub
 *   4. Creates a GitHub release with the .exe attached
 *   5. Players / launcher download the .exe from the release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG_PATH = path.join(__dirname, 'package.json');
const MANIFEST_PATH = path.join(__dirname, 'ngames.manifest.json');
const REPO = 'ktdtech223dev/nigarena';
const EXE_NAME = 'BlacksArena-portable.exe';

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  return execSync(cmd, { cwd: __dirname, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function getVersion() {
  return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version;
}

function setVersion(ver) {
  // Update package.json
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  pkg.version = ver;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

  // Update ngames.manifest.json
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    manifest.version = ver;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  } catch {}

  return ver;
}

function bump(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch':
    default:      return `${major}.${minor}.${patch + 1}`;
  }
}

function findExe() {
  // electron-builder outputs to dist/
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) return null;
  const files = fs.readdirSync(distDir);
  // Look for portable exe
  const exe = files.find(f => f.endsWith('.exe'));
  return exe ? path.join(distDir, exe) : null;
}

// ── Main ──────────────────────────────────────────────────────────────
const arg = process.argv[2] || 'patch';
const currentVer = getVersion();
let newVer;

if (['major', 'minor', 'patch'].includes(arg)) {
  newVer = bump(currentVer, arg);
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVer = arg;
} else {
  newVer = bump(currentVer, 'patch');
}

console.log('');
console.log("  ╔══════════════════════════════════════╗");
console.log("  ║     BLACK'S ARENA — RELEASE          ║");
console.log("  ╚══════════════════════════════════════╝");
console.log(`  ${currentVer} → v${newVer}`);
console.log('');

// Step 1: Bump version
console.log('  [1/5] Bumping version...');
setVersion(newVer);

// Step 2: Build portable exe
console.log('  [2/5] Building portable .exe...');
try {
  run('npx electron-builder --win portable --config.productName="BlacksArena" --config.win.artifactName="BlacksArena-portable.exe"');
} catch (e) {
  console.error('  Build failed! Make sure electron-builder is installed (npm install)');
  process.exit(1);
}

const exePath = findExe();
if (!exePath) {
  console.error('  Could not find built .exe in dist/');
  process.exit(1);
}
console.log(`  Built: ${path.basename(exePath)}`);

// Step 3: Git commit + tag + push source
console.log('  [3/5] Pushing source to GitHub...');
try { run('git rev-parse --git-dir', { silent: true }); }
catch { run('git init'); }

try { run('git remote get-url origin', { silent: true }); }
catch { run(`git remote add origin https://github.com/${REPO}.git`); }

try { run(`git remote set-url origin https://github.com/${REPO}.git`, { silent: true }); } catch {}

run('git add -A');
try {
  run(`git commit -m "v${newVer}"`);
} catch {
  console.log('  (no changes to commit)');
}

run(`git tag -f v${newVer}`);
run('git branch -M main');
run('git push -u origin main --force');
run(`git push origin v${newVer} --force`);

// Step 4: Create GitHub release
console.log('  [4/5] Creating GitHub release...');
// Never delete old releases — launcher checks latest tag for updates

const notes = [
  `## Black's Arena v${newVer}`,
  '',
  'N Games Network — 2D Arena Shooter',
  '',
  '### Download',
  `Download **${EXE_NAME}** below — no install needed, just run it.`,
  '',
  '### From Source',
  '```',
  'git clone https://github.com/' + REPO + '.git',
  'cd nigarena',
  'npm install',
  'npm start',
  '```',
].join('\\n');

run(`gh release create v${newVer} --repo ${REPO} --title "Black's Arena v${newVer}" --notes "${notes}"`);

// Step 5: Upload .exe to the release
console.log('  [5/5] Uploading .exe to release...');
run(`gh release upload v${newVer} "${exePath}" --repo ${REPO} --clobber`);

console.log('');
console.log(`  DONE! v${newVer} released`);
console.log(`  https://github.com/${REPO}/releases/tag/v${newVer}`);
console.log(`  Players download: ${EXE_NAME}`);
console.log('');
