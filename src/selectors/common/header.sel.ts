import type { HeaderSelectors } from '../../core/types';

export const headerSelectors: HeaderSelectors = {
  logo: '[data-testid="logo"], [data-test-id="logo"], header a[aria-label*="logo" i], header a[aria-label*="home" i], header a[href="/"] img, header a[href="/"], header .logo a, header a.logo',
  navigation: 'header nav, [role="navigation"], ul:has(a[href*="/shop/"]), ul:has(a[href*="/collections/"]), ul:has(a[href*="/category/"])',
  navigationLink: 'a[href]',
  submenu: '[role="menu"], ul ul, [class*="submenu" i], [class*="sub-menu" i], [class*="mega" i], [class*="dropdown" i]',
  searchInput: '[data-testid="search-input"]:visible, input[type="search"]:visible, input[name="q"]:visible, input[name="search"]:visible, input[placeholder*="search" i]:visible, input[placeholder*="looking for" i]:visible, input[placeholder*="find products" i]:visible, input[aria-label*="search" i]:visible',
  searchSubmit: '[data-testid="search-submit"]:visible, button[type="submit"]:visible, button[aria-label*="Search" i]:visible',
  accountIcon: '[data-testid="account-icon"], a[href*="account"], a[href*="login"], button[aria-label*="account" i], button[aria-label*="sign in" i], button[aria-label*="login" i], button[aria-label*="my account" i]',
  cartIcon: '[data-testid="cart-icon"]:visible, a[href*="cart"]:visible, button[aria-label*="cart" i]:visible, button[aria-label*="bag" i]:visible',
  menuButton: '[data-testid="menu-button"], button[aria-label*="menu" i]'
};
