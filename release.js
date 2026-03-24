#!/usr/bin/env node
/**
 * release.js — Auto-push to GitHub as a release with bumped patch number
 *
 * Usage:
 *   node release.js              — auto bumps patch (0.1.0 → 0.1.1)
 *   node release.js 0.2.0       — set exact version
 *   node release.js minor        — bump minor (0.1.0 → 0.2.0)
 *   node release.js major        — bump major (0.1.0 → 1.0.0)
 *   node release.js patch        — bump patch (0.1.0 → 0.1.1)
 *
 * Requires: git, gh (GitHub CLI) installed and authenticated
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG_PATH = path.join(__dirname, 'package.json');
const REPO = 'ktdtech223dev/nigarena';

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  return execSync(cmd, { cwd: __dirname, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  return pkg.version;
}

function setVersion(ver) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  pkg.version = ver;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
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

console.log(`\n  Black's Arena Release`);
console.log(`  ${currentVer} → v${newVer}\n`);

setVersion(newVer);

// Ensure git is initialized and remote set
try { run('git rev-parse --git-dir', { silent: true }); }
catch { run('git init'); }

try { run('git remote get-url origin', { silent: true }); }
catch { run(`git remote add origin https://github.com/${REPO}.git`); }

// Set remote in case it changed
try { run(`git remote set-url origin https://github.com/${REPO}.git`, { silent: true }); } catch {}

// Stage, commit, tag, push
run('git add -A');

try {
  run(`git commit -m "v${newVer} — Black's Arena release"`);
} catch {
  console.log('  (no changes to commit, tagging existing HEAD)');
}

run(`git tag -f v${newVer}`);
run('git push -u origin main --force');
run(`git push origin v${newVer} --force`);

// Create GitHub release via gh CLI
const notes = `## Black's Arena v${newVer}\n\nN Games Network — Arena Shooter\n\nRun \`npm install && npm start\` to play.`;
try {
  run(`gh release delete v${newVer} --repo ${REPO} -y`, { silent: true });
} catch {}
run(`gh release create v${newVer} --repo ${REPO} --title "v${newVer}" --notes "${notes.replace(/"/g, '\\"')}"`);

console.log(`\n  Released v${newVer} to https://github.com/${REPO}/releases`);
console.log(`  Done!\n`);
