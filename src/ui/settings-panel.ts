import type { MakeBilibiliGreatThanEverBeforeModule } from '../types';
import { PLUGIN_VERSION, UPSTREAM_PACKAGE, UPSTREAM_VERSION } from '../version';
import { getEnabled, setEnabled } from '../utils/settings-store';
import { onDOMContentLoaded } from '../utils/on-load-event';

const HOST_ID = 'mbgteb-us-settings-host';

export function mountSettingsPanel(modules: MakeBilibiliGreatThanEverBeforeModule[]): void {
  onDOMContentLoaded(() => {
    if (document.getElementById(HOST_ID)) {
      return;
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-mbgteb-us', '1');
    // Isolate from Bilibili page CSS
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(buildStyles());

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fab';
    fab.title = 'Bilibili Userscripts 设置';
    fab.textContent = 'BG';
    fab.setAttribute('aria-label', '打开插件设置');

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Bilibili Userscripts 功能开关');

    panel.append(
      buildHeader(panel),
      buildVersionBlock(),
      buildModuleList(modules),
      buildFooter()
    );

    fab.addEventListener('click', (ev) => {
      ev.stopPropagation();
      panel.hidden = !panel.hidden;
    });

    // Prevent Bilibili global click handlers from treating panel interactions as page UI
    host.addEventListener('click', (ev) => ev.stopPropagation());
    host.addEventListener('mousedown', (ev) => ev.stopPropagation());

    shadow.append(fab, panel);
    (document.body || document.documentElement).appendChild(host);
  });
}

function buildHeader(panel: HTMLElement): HTMLElement {
  const header = document.createElement('div');
  header.className = 'header';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = '功能开关';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.textContent = '×';
  close.setAttribute('aria-label', '关闭');
  close.addEventListener('click', () => {
    panel.hidden = true;
  });

  header.append(title, close);
  return header;
}

function buildVersionBlock(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'version';

  const local = document.createElement('div');
  local.textContent = `本插件：${PLUGIN_VERSION}`;

  const upstream = document.createElement('div');
  upstream.textContent = `基于上游：${UPSTREAM_VERSION}`;

  const status = document.createElement('div');
  status.className = 'update-status';
  status.textContent = '正在检查上游更新…';

  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'check';
  checkBtn.textContent = '检查更新';
  checkBtn.addEventListener('click', () => {
    void refreshUpstreamStatus(status, checkBtn);
  });

  box.append(local, upstream, status, checkBtn);
  void refreshUpstreamStatus(status, checkBtn);
  return box;
}

async function refreshUpstreamStatus(statusEl: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  statusEl.textContent = '正在检查上游更新…';
  statusEl.classList.remove('is-outdated', 'is-ok', 'is-error');

  try {
    const latest = await fetchUpstreamVersion();
    if (!latest) {
      statusEl.textContent = '无法获取上游版本（网络或 CORS）';
      statusEl.classList.add('is-error');
      return;
    }
    if (compareSemver(latest, UPSTREAM_VERSION) > 0) {
      statusEl.textContent = `上游有新版本 ${latest}。请在本机运行：pnpm sync:upstream`;
      statusEl.classList.add('is-outdated');
    } else {
      statusEl.textContent = `上游已是最新（${latest}）`;
      statusEl.classList.add('is-ok');
    }
  } catch {
    statusEl.textContent = '检查失败，请稍后重试';
    statusEl.classList.add('is-error');
  } finally {
    btn.disabled = false;
  }
}

async function fetchUpstreamVersion(): Promise<string | null> {
  const urls = [
    `https://unpkg.com/${UPSTREAM_PACKAGE}/package.json`,
    `https://cdn.jsdelivr.net/npm/${UPSTREAM_PACKAGE}/package.json`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        continue;
      }
      const data = await res.json() as { version?: string };
      if (typeof data.version === 'string' && data.version.length > 0) {
        return data.version;
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Returns positive if a > b, 0 if equal, negative if a < b. */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

function parseSemver(v: string): [number, number, number] {
  const core = v.split('-')[0].split('+')[0];
  const parts = core.split('.').map(p => Number.parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function buildModuleList(modules: MakeBilibiliGreatThanEverBeforeModule[]): HTMLElement {
  const list = document.createElement('div');
  list.className = 'list';

  for (const mod of modules) {
    const row = document.createElement('label');
    row.className = 'row';

    const text = document.createElement('span');
    text.className = 'row-text';
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = mod.description;
    const id = document.createElement('span');
    id.className = 'row-id';
    id.textContent = mod.name;
    text.append(name, id);

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = getEnabled(mod);
    toggle.addEventListener('change', () => {
      setEnabled(mod, toggle.checked);
      try {
        unsafeWindow.location.reload();
      } catch {
        // swallow
      }
    });

    row.append(text, toggle);
    list.appendChild(row);
  }

  return list;
}

function buildFooter(): HTMLElement {
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.textContent = '切换后自动刷新页面。私人使用 · 基于 MBGTEB (MIT)';
  return footer;
}

function buildStyles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
:host {
  all: initial;
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #1a1a1a;
}
*, *::before, *::after {
  box-sizing: border-box;
}
.fab {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: #00a1d6;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}
.fab:hover {
  background: #0090c0;
}
.panel {
  position: absolute;
  right: 0;
  bottom: 56px;
  width: min(360px, calc(100vw - 24px));
  max-height: min(70vh, 560px);
  overflow: auto;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  padding: 12px;
  color: #1a1a1a;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.title {
  font-weight: 700;
  font-size: 15px;
}
.close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #666;
  padding: 0 4px;
}
.version {
  background: #f6f7f9;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #444;
}
.update-status.is-outdated {
  color: #b45309;
  font-weight: 600;
}
.update-status.is-ok {
  color: #15803d;
}
.update-status.is-error {
  color: #b91c1c;
}
.check {
  justify-self: start;
  margin-top: 4px;
  border: 1px solid #d0d5dd;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  color: #1a1a1a;
}
.check:disabled {
  opacity: 0.6;
  cursor: default;
}
.list {
  display: grid;
  gap: 6px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}
.row:hover {
  background: #f3f5f7;
}
.row-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.row-name {
  font-size: 13px;
  color: #111;
}
.row-id {
  font-size: 11px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: #00a1d6;
}
.footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  font-size: 11px;
  color: #888;
}
`;
  return style;
}
