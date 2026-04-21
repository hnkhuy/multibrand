import type { HeaderSelectors } from '../../core/types';

export const headerSelectors: HeaderSelectors = {
  logo: 'header a[href="/"] img[alt*="Skechers" i], header a[aria-label*="Skechers" i], header a[href="/"] img, header a[href="/"], header .logo a, header a.logo',
  searchInput: '[data-testid="search-input"], input[type="search"], input[name="q"], input[name="search"]',
  searchSubmit: '[data-testid="search-submit"], button[type="submit"], button[aria-label*="Search" i]',
  cartIcon: '[data-testid="cart-icon"], a[href*="cart"], button[aria-label*="cart" i]',
  menuButton: '[data-testid="menu-button"], button[aria-label*="menu" i]'
};
