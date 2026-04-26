import type { DeepPartial, Selectors } from '../../../core/types';

export const drmartensHeaderSelectors: DeepPartial<Selectors['header']> = {
  searchInput:
    'input[type="search"]:visible, input[name="q"]:visible, [data-testid="search-input"]:visible, input[placeholder*="search" i]:visible, input[placeholder*="looking for" i]:visible',
  searchSubmit: 'button[type="submit"]:visible, button[aria-label*="search" i]:visible'
};
