import { searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';

test.describe('search', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('can search for products', async ({ ctx, home, plp, page }) => {
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await plp.expectLoaded();
  });
});
