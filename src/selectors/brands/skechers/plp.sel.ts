import type { DeepPartial, Selectors } from '../../../core/types';

export const skechersPlpSelectors: DeepPartial<Selectors['plp']> = {
  productCard: '.productCard, [data-product-id], main [data-testid="product-card"], main .product-tile, main .product',
  // productName intentionally omitted — Skechers SPA uses styled-components hash classes;
  // the common selector's a[href*=".html"] fallback finds the product link inside the card.
  productLink: 'a[href*=".html"], a[href*="/product/"], a[href*="/p/"]',
  quickAdd: '.quick-add-button, [class*="quick-add"], button:has-text("Quick Add")',
};
