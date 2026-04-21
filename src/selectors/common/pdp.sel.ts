import type { PDPSelectors } from '../../core/types';

export const pdpSelectors: PDPSelectors = {
  addToCartButton: '[data-testid="add-to-cart"], button[name="add"], button:has-text("Add to Cart"), button:has-text("Add to Bag")',
  sizeSelector: '[data-testid="size-selector"], select[name*="size" i], button[aria-label*="size" i]',
  productTitle: '[data-testid="product-title"], h1'
};
