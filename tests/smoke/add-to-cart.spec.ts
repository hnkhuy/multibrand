import { searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test } from '../../src/fixtures/test.fixture';

test.describe('add to cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('can add a product to the mini cart', async ({ ctx, home, plp, pdp }) => {
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded();
    await plp.openFirstProduct();
    await pdp.expectLoaded();
    await pdp.addToCart();
    await pdp.miniCart.expectOpen();
  });
});
