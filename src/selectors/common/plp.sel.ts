import type { PLPSelectors } from '../../core/types';

export const plpSelectors: PLPSelectors = {
  productCard: '[data-testid="product-card"], [data-product-id], .product, .product-tile',
  productName: '[data-testid="product-name"], .product-name, .product-title, a[href*="/product"]',
  filters: '[data-testid="filters"], aside, .filters'
};
