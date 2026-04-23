import type { DeepPartial, Selectors } from '../../../core/types';

export const platypusHeaderSelectors: DeepPartial<Selectors> = {
  header: {
    searchInput: 'input[name="q"]:visible, input[type="search"]:visible, [data-testid="search-input"]:visible, input[placeholder*="search" i]:visible, input[placeholder*="looking for" i]:visible, input[placeholder*="find products" i]:visible',
    cartIcon: 'a[href*="cart"]:visible, button[aria-label*="cart" i]:visible, button[aria-label*="bag" i]:visible, [data-testid="cart-icon"]:visible'
  }
};
