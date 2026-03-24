/**
 * updater.js — Game version info for the N Games Launcher
 *
 * The LAUNCHER handles checking GitHub releases and downloading updates.
 * This module just exposes the game's current version and repo info
 * so the launcher can query it.
 *
 * Launcher update flow:
 *   1. Launcher reads game's ngames.manifest.json (or queries this module)
 *   2. Launcher calls GET https://api.github.com/repos/ktdtech223dev/nigarena/releases/latest
 *   3. Compares tag_name against installed version
 *   4. If newer → downloads zipball, extracts, replaces game files
 *   5. Launches the updated game
 */

const fs = require('fs');
const path = require('path');

function getLocalVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

module.exports = {
  getLocalVersion,
  gameId: 'project-x',
  gameName: "Black's Arena",
  repo: 'ktdtech223dev/nigarena',
  repoUrl: 'https://github.com/ktdtech223dev/nigarena',
  releasesApi: 'https://api.github.com/repos/ktdtech223dev/nigarena/releases/latest',
};
