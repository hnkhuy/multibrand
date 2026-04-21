import type { DeepPartial, Selectors } from '../../../core/types';

export const skechersPlpSelectors: DeepPartial<Selectors> = {
  plp: {
    productCard: '[data-testid="product-card"], .product-tile, .product',
    productName: '[data-testid="product-name"], .product-name, .product-title'
  }
};
