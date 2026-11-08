#!/usr/bin/env node
/**
 * Copy the release userscript into a Userscripts-readable directory.
 *
 * Configure destination once via:
 *   - env USERSCRIPTS_DIR
 *   - or file .userscripts-path in repo root (single line path)
 *
 * Tip (recommended on macOS): in the Userscripts Mac app, set save location to
 * this repo's `dist/` or `userscripts-out/` — writing into Library/Containers
 * from the terminal is often blocked by macOS TCC.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const CONFIG = join(ROOT, '.userscripts-path');
const FALLBACK_OUT = join(ROOT, 'userscripts-out');

const DEFAULT_CANDIDATES = [
  join(homedir(), 'Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts'),
  join(homedir(), 'Library/Containers/Userscripts/Data/Documents/scripts')
];

const RELEASE_USER_JS = 'bilibili-great-userscripts-toggle.user.js';

function log(...args) {
  console.log('[install:userscripts]', ...args);
}

function resolveConfiguredPath(raw) {
  if (!raw) return null;
  return isAbsolute(raw) ? resolve(raw) : resolve(ROOT, raw);
}

function resolveTargetDir() {
  if (process.env.USERSCRIPTS_DIR) {
    return resolveConfiguredPath(process.env.USERSCRIPTS_DIR);
  }
  if (existsSync(CONFIG)) {
    const line = readFileSync(CONFIG, 'utf8').split('\n').map(s => s.trim()).find(Boolean);
    if (line) return resolveConfiguredPath(line);
  }
  for (const candidate of DEFAULT_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return FALLBACK_OUT;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ missing. Run `pnpm build` first.');
    process.exit(1);
  }

  const releaseSrc = join(DIST, RELEASE_USER_JS);
  if (!existsSync(releaseSrc)) {
    console.error(`Missing ${RELEASE_USER_JS}. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  let target = resolveTargetDir();
  try {
    mkdirSync(target, { recursive: true });
  } catch (err) {
    log('cannot create', target, '-', err.message);
    target = FALLBACK_OUT;
    mkdirSync(target, { recursive: true });
    log('falling back to', target);
  }

  const dest = join(target, RELEASE_USER_JS);
  try {
    copyFileSync(releaseSrc, dest);
    log('copied', RELEASE_USER_JS, '->', dest);
  } catch (err) {
    if (target !== FALLBACK_OUT) {
      log('copy failed (', err.code || err.message, '), falling back to', FALLBACK_OUT);
      mkdirSync(FALLBACK_OUT, { recursive: true });
      const fallbackDest = join(FALLBACK_OUT, RELEASE_USER_JS);
      copyFileSync(releaseSrc, fallbackDest);
      target = FALLBACK_OUT;
      log('copied', RELEASE_USER_JS, '->', fallbackDest);
    } else {
      throw err;
    }
  }

  // Remove Finder “副本 / copy” leftovers and old debug installs that share our prefix
  for (const file of readdirSync(target)) {
    if (!file.startsWith('bilibili-great-userscripts-toggle')) continue;
    if (file === RELEASE_USER_JS) continue;
    try {
      unlinkSync(join(target, file));
      log('removed stale', file);
    } catch (err) {
      log('could not remove', file, '-', err.message);
    }
  }

  // Never install debug builds — they share the same @name and would double-run.
  const debugNoise = readdirSync(DIST).filter(f => f.includes('.debug.'));
  if (debugNoise.length) {
    log('skipped debug artifacts:', debugNoise.join(', '));
  }

  if (!existsSync(CONFIG) && !process.env.USERSCRIPTS_DIR) {
    writeFileSync(CONFIG, `${target}\n`);
    log('wrote', CONFIG);
  }

  log('done.');
  if (target === DIST || target === FALLBACK_OUT || target.startsWith(ROOT)) {
    log('In Userscripts Mac app, set save location to:', target);
  }
  log('Then open the Userscripts extension popup once so Safari reloads scripts.');
}

main();
