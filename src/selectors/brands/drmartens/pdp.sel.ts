import type { DeepPartial, Selectors } from '../../../core/types';

export const drmartensPdpSelectors: DeepPartial<Selectors['pdp']> = {
  addToCartButton: 'button:has-text("Add to Bag"), button:has-text("Add to Cart"), [data-testid="add-to-cart"]'
};
