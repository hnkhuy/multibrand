import { test, expect } from '../../src/fixtures/test.fixture';

test.describe('framework context', () => {
  test('injects brand context and selectors for every project', async ({ ctx, selectors }) => {
    expect(ctx.brand).toMatch(/^(drmartens|platypus|skechers|vans)$/);
    expect(ctx.region).toMatch(/^(au|nz)$/);
    expect(ctx.baseURL).toMatch(/^https?:\/\//);
    expect(selectors.header.searchInput).toBeTruthy();
    expect(selectors.pdp.addToCartButton).toBeTruthy();
    expect(selectors.minicart.checkoutButton).toBeTruthy();
  });
});
