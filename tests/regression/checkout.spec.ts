import { searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';

test.describe('checkout', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('can navigate from mini cart to checkout', async ({ ctx, home, plp, pdp, page }) => {
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded();
    await plp.openFirstProduct();
    await pdp.addToCart();
    await pdp.miniCart.expectOpen();
    await pdp.miniCart.goToCheckout();

    await expect(page).toHaveURL(/checkout/i);
  });
});
