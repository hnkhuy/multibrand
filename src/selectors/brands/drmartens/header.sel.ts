import type { DeepPartial, Selectors } from '../../../core/types';

export const drmartensHeaderSelectors: DeepPartial<Selectors> = {
  header: {
    searchInput: 'input[type="search"], input[name="q"], [data-testid="search-input"]',
    searchSubmit: 'button[type="submit"], button[aria-label*="search" i]'
  }
};
