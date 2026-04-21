import type { HeaderSelectors } from '../../core/types';

export const headerSelectors: HeaderSelectors = {
  logo: '[data-testid="logo"], [data-test-id="logo"], header a[aria-label*="logo" i], header a[aria-label*="home" i], header a[href="/"] img, header a[href="/"], header .logo a, header a.logo',
  searchInput: '[data-testid="search-input"], input[type="search"], input[name="q"], input[name="search"]',
  searchSubmit: '[data-testid="search-submit"], button[type="submit"], button[aria-label*="Search" i]',
  cartIcon: '[data-testid="cart-icon"], a[href*="cart"], button[aria-label*="cart" i]',
  menuButton: '[data-testid="menu-button"], button[aria-label*="menu" i]'
};
