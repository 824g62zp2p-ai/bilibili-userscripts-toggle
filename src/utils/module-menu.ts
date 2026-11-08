import type { MakeBilibiliGreatThanEverBeforeModule } from '../types';
import { getEnabled } from './settings-store';

/**
 * Userscripts (Safari) does not support GM.registerMenuCommand.
 * Enablement is controlled by the in-page settings panel + localStorage.
 */
export function initModuleMenu(mod: MakeBilibiliGreatThanEverBeforeModule): boolean {
  return getEnabled(mod);
}
