import type { DeepPartial, Selectors } from '../../../core/types';

export const skechersPlpSelectors: DeepPartial<Selectors['plp']> = {
  productCard: 'main [data-testid="product-card"], main .product-tile, main .product',
  productName: '[data-testid="product-name"], .product-name, .product-title'
};
