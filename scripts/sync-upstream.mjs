#!/usr/bin/env node
/**
 * Fetch the latest Make-Bilibili-Great-Than-Ever-Before release and merge
 * upstream source into this Userscripts fork, preserving local adapters.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const SKIP_INSTALL = process.argv.includes('--skip-install');
const SKIP_BUILD = process.argv.includes('--skip-build');

const UPSTREAM_REPO = 'https://github.com/SukkaW/Make-Bilibili-Great-Than-Ever-Before.git';
const UPSTREAM_PACKAGE = 'make-bilibili-great-than-ever-before';

/** Paths copied wholesale from upstream (relative to repo root). */
const SYNC_PATHS = [
  'src/modules',
  'src/core',
  'src/logger.ts',
  'src/types.ts',
  'src/dummy.js',
  'src/gm.d.ts',
  'eslint.config.js',
  'tsconfig.json',
  'pnpm-workspace.yaml',
  '.node-version'
];

/** Local utils filenames that must never be overwritten. */
const PROTECTED_UTILS = new Set(['module-menu.ts', 'settings-store.ts']);

function log(...args) {
  console.log('[sync-upstream]', ...args);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd || ROOT,
    shell: false,
    env: process.env
  });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function compareSemver(a, b) {
  const pa = String(a).split('-')[0].split('.').map(n => Number.parseInt(n, 10) || 0);
  const pb = String(b).split('-')[0].split('.').map(n => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function fetchLatestUpstreamVersion() {
  const urls = [
    `https://registry.npmjs.org/${UPSTREAM_PACKAGE}/latest`,
    `https://unpkg.com/${UPSTREAM_PACKAGE}/package.json`,
    `https://cdn.jsdelivr.net/npm/${UPSTREAM_PACKAGE}/package.json`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const version = data.version;
      if (typeof version === 'string') return version;
    } catch {
      // try next
    }
  }
  throw new Error('Unable to resolve latest upstream version from npm/CDN');
}

function readLock() {
  const lockPath = join(ROOT, 'upstream.lock.json');
  if (!existsSync(lockPath)) {
    return { package: UPSTREAM_PACKAGE, version: '0.0.0' };
  }
  return JSON.parse(readFileSync(lockPath, 'utf8'));
}

function extractUsSuffix(version) {
  const m = String(version).match(/-us\.(\d+)$/);
  if (!m) return 1;
  return Number.parseInt(m[1], 10) || 1;
}

function mergePackageJson(upstreamPkg) {
  const localPath = join(ROOT, 'package.json');
  const local = JSON.parse(readFileSync(localPath, 'utf8'));

  local.dependencies = { ...upstreamPkg.dependencies };
  local.devDependencies = { ...upstreamPkg.devDependencies };
  if (upstreamPkg.packageManager) {
    local.packageManager = upstreamPkg.packageManager;
  }

  local.name = 'bilibili-userscripts-toggle';
  local.description
    = 'Safari Userscripts fork of Make-Bilibili-Great-Than-Ever-Before with per-feature in-page toggles';
  local.author = 'Timmy (Userscripts toggle fork; upstream by SukkaW)';
  local.license = 'MIT';
  local.main = './dist/bilibili-great-userscripts-toggle.user.js';
  local.files = ['dist'];
  local.repository = {
    type: 'git',
    url: 'https://github.com/824g62zp2p-ai/bilibili-userscripts-toggle.git'
  };
  local.homepage = 'https://github.com/824g62zp2p-ai/bilibili-userscripts-toggle#readme';
  local.bugs = {
    url: 'https://github.com/824g62zp2p-ai/bilibili-userscripts-toggle/issues'
  };
  local.scripts = {
    lint: 'eslint --format=sukka .',
    build: 'rollup -c rollup.config.ts --configPlugin=swc3 --bundleConfigAsCjs',
    'sync:upstream': 'node ./scripts/sync-upstream.mjs',
    'sync:upstream:force': 'node ./scripts/sync-upstream.mjs --force',
    'install:userscripts': 'node ./scripts/install-to-userscripts.mjs',
    smoke: 'node ./scripts/smoke-check.mjs',
    'release:local': 'node ./scripts/sync-upstream.mjs && pnpm run build && node ./scripts/install-to-userscripts.mjs'
  };

  const usSuffix = extractUsSuffix(local.version);
  local.version = `${upstreamPkg.version}-us.${usSuffix}`;

  writeFileSync(localPath, `${JSON.stringify(local, null, 2)}\n`);
  return local.version;
}

function updateVersionTs(upstreamVersion, pluginVersion) {
  const content = `/** Local private fork version (semver). */
export const PLUGIN_VERSION = '${pluginVersion}';

/**
 * Upstream Make-Bilibili-Great-Than-Ever-Before package version this tree is based on.
 * Updated by \`pnpm sync:upstream\`.
 */
export const UPSTREAM_VERSION = '${upstreamVersion}';

/** npm package name used to probe upstream releases. */
export const UPSTREAM_PACKAGE = '${UPSTREAM_PACKAGE}';
`;
  writeFileSync(join(ROOT, 'src/version.ts'), content);
}

function syncTree(srcRoot) {
  for (const rel of SYNC_PATHS) {
    const from = join(srcRoot, rel);
    const to = join(ROOT, rel);
    if (!existsSync(from)) {
      log('skip missing upstream path:', rel);
      continue;
    }
    rmSync(to, { recursive: true, force: true });
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
    log('synced', rel);
  }

  const utilsFrom = join(srcRoot, 'src/utils');
  const utilsTo = join(ROOT, 'src/utils');
  mkdirSync(utilsTo, { recursive: true });
  for (const name of readdirSync(utilsFrom)) {
    if (PROTECTED_UTILS.has(name)) {
      log('keep local src/utils/' + name);
      continue;
    }
    cpSync(join(utilsFrom, name), join(utilsTo, name), { recursive: true });
    log('synced src/utils/' + name);
  }

  log('kept local src/index.ts, src/ui/, userscript.meta.json, rollup.config.ts');
  applyLocalFixups();
}

/** Re-apply fork-specific bugfixes that live inside otherwise-synced upstream files. */
function applyLocalFixups() {
  const defuseStorage = join(ROOT, 'src/modules/defuse-storage.ts');
  if (!existsSync(defuseStorage)) return;
  const before = readFileSync(defuseStorage, 'utf8');
  const after = before.replace(
    /return store\.size \+ localStorage\.length;/,
    'return store.size + orignalLocalStorage.length;'
  );
  if (after !== before) {
    writeFileSync(defuseStorage, after);
    log('applied fixup: defuse-storage length getter');
  }
}

async function syncFromCheckout(srcRoot, latest) {
  const upstreamPkg = JSON.parse(readFileSync(join(srcRoot, 'package.json'), 'utf8'));
  const resolvedVersion = upstreamPkg.version || latest;

  syncTree(srcRoot);

  if (existsSync(join(srcRoot, 'pnpm-lock.yaml'))) {
    cpSync(join(srcRoot, 'pnpm-lock.yaml'), join(ROOT, 'pnpm-lock.yaml'));
  }

  const pluginVersion = mergePackageJson(upstreamPkg);
  updateVersionTs(resolvedVersion, pluginVersion);

  let commit = null;
  const rev = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: srcRoot,
    encoding: 'utf8'
  });
  if (rev.status === 0) {
    commit = rev.stdout.trim();
  }

  writeFileSync(
    join(ROOT, 'upstream.lock.json'),
    `${JSON.stringify({
      package: UPSTREAM_PACKAGE,
      version: resolvedVersion,
      repository: UPSTREAM_REPO,
      syncedAt: new Date().toISOString(),
      commit
    }, null, 2)}\n`
  );

  if (!SKIP_INSTALL) {
    log('installing dependencies…');
    run('pnpm', ['install']);
  }
  if (!SKIP_BUILD) {
    log('building…');
    run('pnpm', ['run', 'build']);
  }
  log('done. plugin version:', pluginVersion, 'upstream:', resolvedVersion);
}

async function main() {
  const lock = readLock();
  const latest = await fetchLatestUpstreamVersion();
  log('local upstream lock:', lock.version);
  log('latest upstream:', latest);

  if (!FORCE && compareSemver(latest, lock.version) <= 0) {
    log('already up to date. Use --force to re-sync.');
    if (!SKIP_BUILD) {
      run('pnpm', ['run', 'build']);
    }
    return;
  }

  const work = mkdtempSync(join(tmpdir(), 'mbgteb-sync-'));
  try {
    log('cloning upstream at npm version', latest);
    const tagNames = [`v${latest}`, latest];
    let cloned = false;
    for (const tag of tagNames) {
      rmSync(work, { recursive: true, force: true });
      mkdirSync(work, { recursive: true });
      rmSync(work, { recursive: true, force: true });
      const tagTry = spawnSync(
        'git',
        ['clone', '--depth', '1', '--branch', tag, UPSTREAM_REPO, work],
        { stdio: 'inherit' }
      );
      if (tagTry.status === 0) {
        cloned = true;
        log('cloned tag', tag);
        break;
      }
    }
    if (!cloned) {
      throw new Error(
        `Failed to clone upstream tag for ${latest}. Refusing to fall back to default branch to avoid version drift. Retry later or check GitHub tags.`
      );
    }

    const pkg = JSON.parse(readFileSync(join(work, 'package.json'), 'utf8'));
    if (compareSemver(pkg.version, latest) !== 0) {
      throw new Error(
        `Cloned package.json version ${pkg.version} does not match requested ${latest}`
      );
    }

    await syncFromCheckout(work, latest);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
