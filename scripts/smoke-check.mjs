#!/usr/bin/env node
/**
 * Offline smoke checks for the Userscripts fork.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST_JS = join(ROOT, 'dist/bilibili-great-userscripts-toggle.user.js');

const EXPECTED_MODULES = [
  'disable-storage',
  'defuse-spyware',
  'disable-av1',
  'enhance-live',
  'fix-copy-in-cv',
  'force-enable-4k',
  'no-ad',
  'no-p2p',
  'no-webrtc',
  'optimize-homepage',
  'optimize-story',
  'player-video-fit',
  'remove-black-backdrop-filter',
  'remove-useless-url-params',
  'thread-ripper',
  'use-system-fonts'
];

let failed = 0;
function ok(msg) {
  console.log('✓', msg);
}
function bad(msg) {
  failed += 1;
  console.error('✗', msg);
}

function main() {
  const build = spawnSync('pnpm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
  if (build.status !== 0) {
    bad('build failed');
    process.exit(1);
  }
  ok('build succeeded');

  if (!existsSync(DIST_JS)) {
    bad('release userscript missing');
    process.exit(1);
  }

  const code = readFileSync(DIST_JS, 'utf8');
  const header = code.slice(0, 800);

  if (!header.includes('@inject-into page')) bad('missing @inject-into page');
  else ok('@inject-into page');

  if (!header.includes('@grant       none') && !header.includes('@grant none')) bad('missing @grant none');
  else ok('@grant none');

  if (/@noframes\b/.test(header)) bad('@noframes present (breaks player iframe)');
  else ok('no @noframes (player iframe OK)');

  if (!code.includes('var unsafeWindow=window;')) bad('missing unsafeWindow shim');
  else ok('unsafeWindow shim');

  // Comment in module-menu.ts mentions the API name; only fail on real calls.
  if (/\bGM(?:_|\.)registerMenuCommand\s*\(/.test(code)) {
    bad('still calls GM.registerMenuCommand');
  } else ok('no GM.registerMenuCommand call');

  if (!code.includes('mbgteb-us-settings-host')) bad('settings panel host missing');
  else ok('settings panel present');

  if (!code.includes('attachShadow')) bad('settings panel not using Shadow DOM');
  else ok('settings panel Shadow DOM');

  if (code.includes('store.size + localStorage.length')) {
    bad('defuse-storage length recursion bug present');
  } else ok('defuse-storage length fix present');

  for (const name of EXPECTED_MODULES) {
    if (!code.includes(`"${name}"`) && !code.includes(`'${name}'`) && !code.includes(name)) {
      // minifier may keep string names for module.name
      if (!code.includes(name)) bad(`module not found in bundle: ${name}`);
      else ok(`module ${name}`);
    } else {
      ok(`module ${name}`);
    }
  }

  const outDir = join(ROOT, 'userscripts-out');
  if (existsSync(outDir)) {
    const stale = readdirSync(outDir).filter(
      f => f.startsWith('bilibili-great-userscripts-toggle') && f !== 'bilibili-great-userscripts-toggle.user.js'
    );
    if (stale.length) bad(`stale installs in userscripts-out: ${stale.join(', ')}`);
    else ok('userscripts-out clean (or only release file)');
  }

  // upstream version probe
  return fetch('https://registry.npmjs.org/make-bilibili-great-than-ever-before/latest')
    .then(r => r.json())
    .then(data => {
      if (data?.version) ok(`upstream npm reachable (${data.version})`);
      else bad('upstream npm response missing version');
    })
    .catch(err => bad(`upstream npm unreachable: ${err.message}`))
    .finally(() => {
      if (failed) {
        console.error(`\n${failed} check(s) failed`);
        process.exit(1);
      }
      console.log('\nAll smoke checks passed');
    });
}

main();
