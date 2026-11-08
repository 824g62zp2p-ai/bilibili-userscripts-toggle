import type { MakeBilibiliGreatThanEverBeforeModule } from '../types';

const KEY_PREFIX = 'mbgteb-us:module:';
const STORAGE_ROOT = 'mbgteb-us:';

export function storageKeyForModule(name: string): string {
  return KEY_PREFIX + name;
}

export function getEnabled(m: MakeBilibiliGreatThanEverBeforeModule): boolean {
  return readBoolean(storageKeyForModule(m.name), m.defaultEnabled ?? true);
}

export function setEnabled(m: MakeBilibiliGreatThanEverBeforeModule, enabled: boolean): void {
  writeBoolean(storageKeyForModule(m.name), enabled);
}

function readBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const raw = unsafeWindow.localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    // tolerate accidental JSON booleans
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'boolean') {
      return parsed;
    }
  } catch {
    // corrupted or unavailable storage — fall through to default
  }
  return defaultValue;
}

function writeBoolean(key: string, value: boolean): void {
  try {
    unsafeWindow.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // private mode / quota — ignore
  }
}

export function readJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = unsafeWindow.localStorage.getItem(STORAGE_ROOT + key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    unsafeWindow.localStorage.setItem(STORAGE_ROOT + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
