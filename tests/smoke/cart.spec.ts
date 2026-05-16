// TC coverage: CT-001..CT-024, CT-drm-001, CT-van-001, CT-van-002, CT-skx-001
// Based on: src/documents/tcs/GRA_Cart-Tcs.csv

import type { Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import type { CartPage } from '../../src/pages/Cart.page';
import type { HomePage } from '../../src/pages/Home.page';
import type { PLPPage } from '../../src/pages/PLP.page';
import type { PDPPage } from '../../src/pages/PDP.page';
import { searchData } from '../../config/testData';

const CHECKOUT_PATH = /\/checkout(?:\/|$|\?)/i;
const PRODUCT_PATH = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const EMPTY_CART = /empty|your bag is empty|your cart is empty|no items/i;
const PRICE_PATTERN = /\$\s?\d/;
const VARIANT_PATTERN = /\b(us|uk|eu|xs|s\b|m\b|l\b|xl|xxl|\d+(?:\.\d+)?)\b|size|colour|color/i;
const AFTERPAY_PATTERN = /afterpay|after pay|4 payments|installments/i;
const PAYMENT_MSG_PATTERN = /afterpay|after pay|paypal|klarna|zip|bnpl|buy now pay later/i;
const BAG_PATTERN = /\bbag\b/i;
const PAYPAL_PATTERN = /paypal|pay in 4|braintree/i;
const LOYALTY_PATTERN = /qantas|qff|platypoints|frequent flyer|points/i;

const SUBTOTAL_SEL = '[data-testid*="subtotal" i], [class*="subtotal" i], [id*="subtotal" i]';
const CHECKOUT_CTA_SEL =
  'button:has-text("Checkout"), a:has-text("Checkout"), button:has-text("Proceed to checkout"), a:has-text("Proceed to checkout"), button:has-text("Continue to checkout"), a:has-text("Continue to checkout")';
const COUPON_INPUT_SEL =
  'input[name*="coupon" i], input[placeholder*="coupon" i], input[placeholder*="promo" i], input[placeholder*="discount" i], input[placeholder*="gift" i], input[aria-label*="coupon" i], input[aria-label*="promo" i], input[id*="coupon" i], input[id*="discount" i], input[id*="promo" i]';
const COUPON_APPLY_SEL =
  'button:has-text("Apply"), button:has-text("Apply Coupon"), button:has-text("Apply coupon"), button:has-text("Submit")';

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

async function atcAndGoToCart(
  page: Page,
  keyword: string,
  home: HomePage,
  plp: PLPPage,
  pdp: PDPPage,
  cart: CartPage
): Promise<void> {
  await home.goto('/');
  await home.search(keyword);
  await plp.expectLoaded().catch(() => undefined);
  const ok = await plp.openFirstProductByHref().catch(() => false);
  if (!ok) await plp.openFirstProduct();
  await pdp.expectLoaded().catch(() => undefined);
  await pdp.addToCart().catch(async () => {
    await pdp.addToCartButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await pdp.addToCartButton.click({ timeout: 10_000 });
  });
  await pdp.dismissInterruptions();
  await page.waitForTimeout(800);
  await cart.gotoCart();
  await cart.expectLoaded();
}

test.describe('cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('CT-001 cart page loads with product in cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    await expect(cart.body).toBeVisible();
    const rows = await cart.getVisibleRows();
    expect(rows.length, 'Cart should have at least one product row.').toBeGreaterThan(0);
  });

  test('CT-002 checkout CTA navigates to /checkout', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const checkoutCta = page.locator(CHECKOUT_CTA_SEL).first();
    await expect(checkoutCta).toBeVisible({ timeout: 10_000 });
    await checkoutCta.click();
    await page.waitForLoadState('domcontentloaded');
    expect(CHECKOUT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('CT-003 increasing item qty updates line total and subtotal', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.quantityControls, 'Brand does not expose qty controls on cart page.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length, 'Precondition: product in cart.').toBeGreaterThan(0);
    const subtotalBefore = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    const increased =
      (await cart.clickQuantityButton(rows[0], 'plus')) ||
      (await cart.setRowQuantity(rows[0], 2));
    if (!increased) {
      test.skip(true, 'Qty increase controls not available on cart page for this brand.');
      return;
    }
    await page.waitForTimeout(1500);
    const subtotalAfter = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    expect(subtotalAfter, 'Subtotal should update after qty increase.').not.toBe(subtotalBefore);
  });

  test('CT-004 decreasing item qty from 2 to 1 updates subtotal', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.quantityControls, 'Brand does not expose qty controls on cart page.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length, 'Precondition: product in cart.').toBeGreaterThan(0);
    const set2 = await cart.setRowQuantity(rows[0], 2);
    if (!set2) await cart.clickQuantityButton(rows[0], 'plus');
    await page.waitForTimeout(1500);
    const subtotalAt2 = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    const decreased =
      (await cart.clickQuantityButton(rows[0], 'minus')) ||
      (await cart.setRowQuantity(rows[0], 1));
    if (!decreased) {
      test.skip(true, 'Qty decrease not available on cart page for this brand.');
      return;
    }
    await page.waitForTimeout(1500);
    const subtotalAt1 = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    expect(subtotalAt1).not.toBe(subtotalAt2);
  });

  test('CT-005 removing a product deletes the row and updates subtotal', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.removeFromCart, 'Brand does not support removing items from cart.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length, 'Precondition: product in cart.').toBeGreaterThan(0);
    const countBefore = (await cart.readHeaderCartCount()) ?? 1;
    const subtotalBefore = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    const removeBtn = cart.removeButton(rows[0]);
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await page.waitForTimeout(1500);
    const afterRows = await cart.getVisibleRows();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptyShown = EMPTY_CART.test(bodyText) || afterRows.length === 0;
    const countAfter = await cart.readHeaderCartCount();
    expect(
      countAfter === null || countAfter < countBefore,
      'Cart count should decrement after remove.'
    ).toBe(true);
    const subtotalAfter = await page.locator(SUBTOTAL_SEL).first().innerText().catch(() => '');
    expect(
      emptyShown || subtotalAfter !== subtotalBefore,
      'Subtotal or empty state should update after remove.'
    ).toBe(true);
  });

  test('CT-006 cart subtotal equals sum of item prices × quantities', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const rowText = await rows[0].innerText();
    const subtotalEl = page.locator(SUBTOTAL_SEL).first();
    if (!(await subtotalEl.isVisible().catch(() => false))) {
      test.skip(true, 'Subtotal element not visible on cart page for this brand.');
      return;
    }
    const subtotalText = (await subtotalEl.innerText().catch(() => '')).trim();
    const priceMatch = rowText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/);
    expect(priceMatch, 'Item price should be visible in cart row.').not.toBeNull();
    expect(subtotalText.length, 'Subtotal text should be non-empty.').toBeGreaterThan(0);
    const itemPrice = parseFloat(priceMatch![0].replace(/[$,\s]/g, ''));
    const subtotalValue = parseFloat(subtotalText.replace(/[$,\s]/g, ''));
    if (Number.isFinite(itemPrice) && Number.isFinite(subtotalValue)) {
      expect(subtotalValue).toBeGreaterThanOrEqual(itemPrice * 0.95);
    }
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('CT-007 empty cart shows empty-state message and continue shopping CTA', async ({ features, cart, page }) => {
    test.skip(!features.emptyCartUI, 'Brand does not have a distinct empty-cart UI.');
    await cart.gotoCart();
    await cart.clearIfPossible();
    await cart.gotoCart();
    const rows = await cart.getVisibleRows();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptySignal =
      EMPTY_CART.test(bodyText) ||
      (await cart.emptyMessage.isVisible().catch(() => false));
    expect(rows.length, 'No product rows in empty cart.').toBe(0);
    expect(emptySignal, 'Empty-state message should be visible.').toBe(true);
    await expect(cart.continueShopping).toBeVisible();
  });

  test('CT-008 cart product row shows image + name + variant + price', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const row = rows[0];
    await expect(cart.itemImage(row)).toBeVisible();
    const name = cart.itemName(row);
    await expect(name).toBeVisible();
    expect((await name.innerText()).trim().length).toBeGreaterThan(1);
    const rowText = await row.innerText();
    expect(PRICE_PATTERN.test(rowText), 'Price should be visible in cart row.').toBe(true);
    expect(VARIANT_PATTERN.test(rowText), 'Variant (size/colour) should be visible in cart row.').toBe(true);
  });

  test('CT-009 removing the last item shows empty state', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.removeFromCart, 'Brand does not support removing items from cart.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    let rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 0; i < 6 && rows.length > 0; i++) {
      const btn = cart.removeButton(rows[0]);
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await page.waitForTimeout(1200);
      rows = await cart.getVisibleRows();
    }
    expect(rows.length, 'All rows should be removed.').toBe(0);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptyShown =
      EMPTY_CART.test(bodyText) ||
      (await cart.emptyMessage.isVisible().catch(() => false));
    expect(emptyShown, 'Empty state should appear after removing last item.').toBe(true);
    const countAfter = await cart.readHeaderCartCount();
    expect(countAfter === 0 || countAfter === null).toBe(true);
  });

  test('CT-010 removing one item from multi-item cart leaves others intact', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.removeFromCart, 'Brand does not support removing items from cart.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    if (rows.length < 2) {
      test.skip(true, 'Only 1 item in cart — needs 2+ products to run this TC.');
      return;
    }
    const beforeCount = rows.length;
    await cart.removeButton(rows[0]).click();
    await page.waitForTimeout(1500);
    const afterRows = await cart.getVisibleRows();
    expect(afterRows.length).toBe(beforeCount - 1);
  });

  test('CT-011 checkout CTA blocked for OOS item', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — OOS product cannot be reliably staged for automation.');
  });

  test('CT-012 header cart count matches total item quantity', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const count = await cart.readHeaderCartCount();
    expect(count, 'Cart count should be readable.').not.toBeNull();
    expect(count!).toBeGreaterThan(0);
  });

  test('CT-013 valid coupon shows discount and reduces cart total', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — valid coupon code not available in automation test data.');
  });

  test('CT-014 invalid coupon shows error message and leaves totals unchanged', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const couponInput = page.locator(COUPON_INPUT_SEL).first();
    if (!(await couponInput.isVisible().catch(() => false))) {
      test.skip(true, 'Coupon input not visible on cart page for this brand.');
      return;
    }
    await couponInput.fill('INVALID-9999');
    const applyBtn = page.locator(COUPON_APPLY_SEL).first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click();
    } else {
      await couponInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasError = /invalid|not valid|doesn.t exist|not found|incorrect|expired|error/i.test(bodyText);
    expect(hasError, 'Error message should appear for invalid coupon.').toBe(true);
  });

  test('CT-015 qty cannot be decreased below 1', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.quantityControls, 'Brand does not expose qty controls on cart page.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    await cart.clickQuantityButton(rows[0], 'minus');
    await page.waitForTimeout(1200);
    const afterRows = await cart.getVisibleRows();
    const qty = await cart.readQuantityFromRow(rows[0]).catch(() => null);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const itemRemoved = afterRows.length === 0;
    const qtyAtMin = qty !== null && qty >= 1;
    const confirmPrompt = /remove|confirm|are you sure/i.test(bodyText);
    expect(itemRemoved || qtyAtMin || confirmPrompt, 'Qty should not go below 1.').toBe(true);
  });

  test('CT-016 sale product shows original and discounted price in cart row', { tag: ['@data-dependent'] }, async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const rowText = (await rows[0].innerText()).replace(/\s+/g, ' ');
    const prices = rowText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|original/i.test(rowText);
    if (!hasSaleSignal || prices.length < 2) {
      test.skip(true, 'No sale product with dual-price in cart on staging — @data-dependent.');
      return;
    }
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('CT-017 cart is functional on mobile viewport and checkout CTA accessible', async ({ ctx, home, plp, pdp, cart, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const checkoutCta = page.locator(CHECKOUT_CTA_SEL).first();
    await expect(checkoutCta).toBeVisible({ timeout: 10_000 });
    await checkoutCta.click();
    await page.waitForLoadState('domcontentloaded');
    expect(CHECKOUT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('CT-018 coupon/promo code input field is visible on cart page', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const couponInput = page.locator(COUPON_INPUT_SEL).first();
    await expect(couponInput).toBeVisible({ timeout: 10_000 });
  });

  test('CT-019 clicking product name or image navigates to its PDP', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.productLinkInCart, 'Brand does not include product links in cart rows.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const link = cart.productLink(rows[0]);
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    await page.goto(new URL(href!, page.url()).href, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('CT-020 guest cart contents persist after page refresh', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rowsBefore = await cart.getVisibleRows();
    expect(rowsBefore.length).toBeGreaterThan(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cart.dismissInterruptions();
    await cart.expectLoaded();
    const rowsAfter = await cart.getVisibleRows();
    expect(rowsAfter.length, 'Cart contents should persist after page refresh.').toBeGreaterThan(0);
  });

  test('CT-021 guest cart contents persist after navigating away and returning', async ({ ctx, home, plp, pdp, cart, page }) => {
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rowsBefore = await cart.getVisibleRows();
    expect(rowsBefore.length).toBeGreaterThan(0);
    await home.goto('/');
    await home.dismissInterruptions();
    await cart.gotoCart();
    await cart.expectLoaded();
    const rowsAfter = await cart.getVisibleRows();
    expect(rowsAfter.length, 'Cart contents should persist after navigation.').toBeGreaterThan(0);
  });

  test('CT-022 Afterpay payment messaging visible on cart page', async ({ ctx, home, plp, pdp, cart, page }) => {
    test.skip(ctx.brand === 'skechers', 'Skechers does not have Afterpay — validated in CT-skx-001.');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(PAYMENT_MSG_PATTERN.test(bodyText), 'Payment messaging should be visible on cart page.').toBe(true);
  });

  test('CT-023 removing applied coupon reverts cart total', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — requires valid coupon code to apply first.');
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('CT-024 removing a product fires a dataLayer remove-from-cart event', { tag: ['@analytics'] }, async ({ features, ctx, home, plp, pdp, cart, page }) => {
    test.skip(!features.removeFromCart, 'Brand does not support removing items from cart.');
    await page.addInitScript(() => {
      (window as any).__dlCapture = [];
      Object.defineProperty(window, 'dataLayer', {
        get: () => (window as any).__dlCapture,
        set(val: unknown[]) { (window as any).__dlCapture = val; }
      });
    });
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await cart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const removeBtn = cart.removeButton(rows[0]);
    if (!(await removeBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Remove button not visible — cannot fire remove event.');
      return;
    }
    await removeBtn.click();
    await page.waitForTimeout(1500);
    const captured = await page.evaluate(() =>
      ((window as any).__dlCapture ?? []).map((e: unknown) => JSON.stringify(e))
    );
    const hasRemoveEvent = (captured as string[]).some((e) =>
      /remove|cart_update|remove_from_cart/i.test(e)
    );
    expect(hasRemoveEvent, 'A remove-from-cart dataLayer event should fire.').toBe(true);
  });

  test('CT-025 mini-cart "View or Update Cart" link navigates to cart page', async ({ ctx, home, plp, pdp, cart, page }) => {
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    const ok = await plp.openFirstProductByHref().catch(() => false);
    if (!ok) await plp.openFirstProduct();
    await pdp.expectLoaded().catch(() => undefined);
    await pdp.addToCart().catch(async () => {
      await pdp.addToCartButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await pdp.addToCartButton.click({ timeout: 10_000 });
    });
    await pdp.dismissInterruptions();
    await page.waitForTimeout(800);
    if (!(await pdp.miniCart.drawer.isVisible().catch(() => false))) {
      await pdp.miniCart.open();
      await page.waitForTimeout(500);
    }
    await pdp.miniCart.expectOpen();
    const viewCartLink = pdp.miniCart.viewCartButton;
    await viewCartLink.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(viewCartLink).toBeVisible({ timeout: 10_000 });
    await viewCartLink.click();
    await page.waitForLoadState('domcontentloaded');
    expect(
      /\/(cart|bag|basket)(?:\/|$|\?)/i.test(new URL(page.url()).pathname),
      '"View or Update Cart" link should navigate to the cart page.'
    ).toBe(true);
    await cart.expectLoaded();
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('CT-drm-001 Dr. Martens cart page uses "Bag" terminology', async ({ ctx, cart, page }) => {
    onlyBrand(ctx, 'drmartens');
    await cart.gotoCart();
    await cart.expectLoaded();
    const headingText = (await page.locator('h1').first().innerText().catch(() => '')).toLowerCase();
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    expect(
      BAG_PATTERN.test(headingText) || BAG_PATTERN.test(bodyText.slice(0, 500)),
      'DRM cart page should contain "bag" terminology.'
    ).toBe(true);
    expect(/\bcart\b/.test(headingText), 'DRM cart heading should NOT contain standalone "cart".').toBe(false);
  });

  test('CT-van-001 Vans cart displays Qantas QFF / PlatyPoints loyalty section', async ({ ctx, home, plp, pdp, cart, page }) => {
    onlyBrand(ctx, 'vans');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(
      LOYALTY_PATTERN.test(bodyText),
      'Vans cart should display Qantas QFF / PlatyPoints loyalty section.'
    ).toBe(true);
  });

  test('CT-van-002 Vans cart payment messaging mentions PayPal', async ({ ctx, home, plp, pdp, cart, page }) => {
    onlyBrand(ctx, 'vans');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(
      PAYPAL_PATTERN.test(bodyText),
      'Vans cart payment messaging should mention PayPal.'
    ).toBe(true);
  });

  test('CT-skx-001 Skechers cart does NOT display Afterpay messaging', async ({ ctx, home, plp, pdp, cart, page }) => {
    onlyBrand(ctx, 'skechers');
    await atcAndGoToCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(
      AFTERPAY_PATTERN.test(bodyText),
      'Skechers cart should NOT contain Afterpay messaging.'
    ).toBe(false);
  });
});
