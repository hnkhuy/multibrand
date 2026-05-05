import type { DeepPartial, Selectors } from '../../../core/types';

export const skechersPlpSelectors: DeepPartial<Selectors['plp']> = {
  productCard: '.productCard, [data-product-id], main [data-testid="product-card"], main .product-tile, main .product',
  productName: '[data-testid="product-name"], .product-name, .product-title',
  productLink: 'a[href*=".html"], a[href*="/product/"], a[href*="/p/"]',
  quickAdd: '.quick-add-button, [class*="quick-add"], button:has-text("Quick Add")',
};
