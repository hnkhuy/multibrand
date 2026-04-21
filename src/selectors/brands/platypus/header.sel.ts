import type { DeepPartial, Selectors } from '../../../core/types';

export const platypusHeaderSelectors: DeepPartial<Selectors> = {
  header: {
    searchInput: 'input[name="q"], input[type="search"], [data-testid="search-input"]',
    cartIcon: 'a[href*="cart"], button[aria-label*="bag" i], [data-testid="cart-icon"]'
  }
};
