import type { MiniCartSelectors } from '../../core/types';

export const minicartSelectors: MiniCartSelectors = {
  drawer: '[data-testid="mini-cart"], [data-testid="minicart"], .mini-cart, .cart-drawer',
  checkoutButton: '[data-testid="checkout"], a[href*="checkout"], button:has-text("Checkout"), button:has-text("Go to checkout")',
  itemRow: '[data-testid="cart-item"], .cart-item, .mini-cart-item'
};
