import type { MakeBilibiliGreatThanEverBeforeModule } from '../types';
import { tagged as css } from 'foxts/tagged';

const removeBlackBackdropFilter: MakeBilibiliGreatThanEverBeforeModule = {
  name: 'remove-black-backdrop-filter',
  description: '去除叔叔去世时的全站黑白效果',
  any({ addStyle }) {
    addStyle(css`html, body { -webkit-filter: none !important; filter: none !important; }`);
  }
};

export default removeBlackBackdropFilter;
