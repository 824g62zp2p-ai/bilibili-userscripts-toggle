import type { MakeBilibiliGreatThanEverBeforeModule } from '../types';
import { tagged as css } from 'foxts/tagged';

const optimizeHomepage: MakeBilibiliGreatThanEverBeforeModule = {
  name: 'optimize-homepage',
  description: '首页广告去除和样式优化',
  any({ addStyle }) {
    addStyle(css`
      .feed2 .feed-card:has(a[href*="cm.bilibili.com"]),
      .feed2 .feed-card:has(.bili-video-card:empty) {
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border-width: 0 !important;
      }

      .feed2 .container > * {
        margin-top: 0 !important
      }
    `);
  }
};

export default optimizeHomepage;
