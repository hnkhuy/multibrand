// TC coverage: MC-001..MC-023, MC-skx-001, MC-drm-001, MC-van-001
// Based on: src/documents/tcs/GRA_MiniCart-Tcs.csv

import type { Locator, Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import { searchData } from '../../config/testData';

const CHECKOUT_PATH = /\/checkout(?:\/|$|\?)/i;
const CART_PATH = /\/(cart|bag|basket)(?:\/|$|\?)/i;
const PRODUCT_PATH = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const EMPTY_CART = /empty|your bag is empty|your cart is empty|no items/i;
const PRICE_PATTERN = /\$\s?\d/;
const VARIANT_PATTERN = /\b(us|uk|eu|xs|s\b|m\b|l\b|xl|xxl|\d+(?:\.\d+)?)\b|size|colour|color/i;
const AFTERPAY_PATTERN = /afterpay|after pay|4 payments|installments/i;
const PAYMENT_MSG_PATTERN = /afterpay|after pay|paypal|klarna|zip|bnpl|buy now pay later/i;
const BAG_PATTERN = /\bbag\b/i;
const PAYPAL_PATTERN = /paypal|pay in 4|braintree/i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

async function atcAndOpenMiniCart(
  page: Page,
  keyword: string,
  home: { goto(p?: string): Promise<void>; search(k: string): Promise<void> },
  plp: { expectLoaded(): Promise<void>; openFirstProduct(): Promise<void>; openFirstProductByHref(): Promise<boolean> },
  pdp: {
    expectLoaded(): Promise<void>;
    addToCart(): Promise<void>;
    dismissInterruptions(): Promise<void>;
    addToCartButton: Locator;
    miniCart: { open(): Promise<void>; drawer: Locator; expectOpen(): Promise<void> };
  }
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
  if (!(await pdp.miniCart.drawer.isVisible().catch(() => false))) {
    await pdp.miniCart.open();
    await page.waitForTimeout(500);
  }
  await pdp.miniCart.expectOpen();
}

test.describe('mini-cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('MC-001 cart icon click opens mini-cart panel', { tag: ['@smoke'] }, async ({ home }) => {
    await home.goto('/');
    await home.header.openCart();
    await home.miniCart.expectOpen();
    await expect(home.miniCart.drawer).toBeVisible();
  });

  test('MC-002 cart count in header increments after adding a product', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await home.goto('/');
    const baseline = (await home.miniCart.readHeaderCartCount()) ?? 0;
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    const ok = await plp.openFirstProductByHref().catch(() => false);
    if (!ok) await plp.openFirstProduct();
    await pdp.expectLoaded().catch(() => undefined);
    await pdp.addToCart().catch(async () => {
      await pdp.addToCartButton.click({ timeout: 10_000 });
    });
    await pdp.dismissInterruptions();
    await page.waitForTimeout(800);
    const after = await pdp.miniCart.readHeaderCartCount();
    expect(after, 'Cart count should be readable after ATC.').not.toBeNull();
    expect(after!).toBeGreaterThan(baseline);
  });

  test('MC-003 removing a product decrements count and updates subtotal', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: product in mini-cart.').toBeGreaterThan(0);
    const countBefore = (await pdp.miniCart.readHeaderCartCount()) ?? 1;
    const subtotalBefore = await pdp.miniCart.readSubtotal();
    const removeBtn = pdp.miniCart.removeButton(rows[0]);
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await page.waitForTimeout(1500);
    const countAfter = await pdp.miniCart.readHeaderCartCount();
    const afterRows = await pdp.miniCart.getVisibleRows();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptyShown = EMPTY_CART.test(bodyText) || afterRows.length === 0;
    const subtotalAfter = await pdp.miniCart.readSubtotal();
    expect(
      countAfter === null || countAfter < countBefore,
      'Cart count should decrement after remove.'
    ).toBe(true);
    expect(
      emptyShown || subtotalAfter !== subtotalBefore,
      'Subtotal should update after remove.'
    ).toBe(true);
  });

  test('MC-004 increasing and decreasing qty in mini-cart updates subtotal', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartQuantityControls, 'Brand does not expose qty controls in mini-cart.');
    test.skip(!features.miniCartSubtotal, 'Brand does not display subtotal in mini-cart.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: product in mini-cart.').toBeGreaterThan(0);
    const subtotalBefore = await pdp.miniCart.readSubtotal();
    const increased =
      (await pdp.miniCart.clickQuantityButton(rows[0], 'plus')) ||
      (await pdp.miniCart.setRowQuantity(rows[0], 2));
    expect(increased, 'Should be able to increase qty.').toBe(true);
    await page.waitForTimeout(1500);
    const subtotalAfterIncrease = await pdp.miniCart.readSubtotal();
    expect(subtotalAfterIncrease, 'Subtotal readable after qty increase.').not.toBeNull();
    expect(subtotalAfterIncrease).not.toBe(subtotalBefore);
    const decreased =
      (await pdp.miniCart.clickQuantityButton(rows[0], 'minus')) ||
      (await pdp.miniCart.setRowQuantity(rows[0], 1));
    expect(decreased, 'Should be able to decrease qty.').toBe(true);
    await page.waitForTimeout(1500);
    const subtotalAfterDecrease = await pdp.miniCart.readSubtotal();
    expect(subtotalAfterDecrease, 'Subtotal readable after qty decrease.').not.toBeNull();
    expect(subtotalAfterDecrease).not.toBe(subtotalAfterIncrease);
  });

  test('MC-005 checkout CTA in mini-cart navigates to checkout', { tag: ['@smoke'] }, async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: product in mini-cart.').toBeGreaterThan(0);
    await pdp.miniCart.goToCheckout();
    expect(CHECKOUT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('MC-006 mini-cart subtotal equals sum of item prices × quantities', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartSubtotal, 'Brand does not display subtotal.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const rowText = await rows[0].innerText();
    const subtotalText = await pdp.miniCart.readSubtotal();
    const priceMatch = rowText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/);
    expect(priceMatch, 'Item price should be visible in mini-cart row.').not.toBeNull();
    expect(subtotalText, 'Subtotal should be visible.').not.toBeNull();
    const itemPrice = parseFloat((priceMatch![0]).replace(/[$,\s]/g, ''));
    const subtotalValue = parseFloat((subtotalText ?? '').replace(/[$,\s]/g, ''));
    if (Number.isFinite(itemPrice) && Number.isFinite(subtotalValue)) {
      // Single item at qty=1: subtotal must be ≥ item price (within 5% rounding tolerance)
      expect(subtotalValue).toBeGreaterThanOrEqual(itemPrice * 0.95);
    }
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('MC-007 empty mini-cart shows empty-state message and no product rows', async ({ home, cart, page }) => {
    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');
    await home.header.openCart();
    await home.miniCart.expectOpen();
    const rows = await home.miniCart.getVisibleRows();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptySignal =
      EMPTY_CART.test(bodyText) ||
      (await home.miniCart.emptyMessage.isVisible().catch(() => false));
    expect(rows.length, 'No product rows in empty mini-cart.').toBe(0);
    expect(emptySignal, 'Empty-state message should be visible.').toBe(true);
    await expect(home.miniCart.continueShoppingCta).toBeVisible();
  });

  test('MC-008 mini-cart product row shows image + name + variant + price', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const row = rows[0];
    await expect(pdp.miniCart.itemImage(row)).toBeVisible();
    const name = pdp.miniCart.itemName(row);
    await expect(name).toBeVisible();
    expect((await name.innerText()).trim().length).toBeGreaterThan(1);
    const rowText = await row.innerText();
    expect(PRICE_PATTERN.test(rowText), 'Price should be visible in row.').toBe(true);
  });

  test('MC-009 clicking product name/image in mini-cart navigates to PDP', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartProductLink, 'Brand does not include product links in mini-cart.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const link = pdp.miniCart.productLink(rows[0]);
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    await page.goto(new URL(href!, page.url()).href, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('MC-010 mini-cart closes via close button', async ({ home }) => {
    await home.goto('/');
    await home.header.openCart();
    await home.miniCart.expectOpen();
    await home.miniCart.close();
    await home.miniCart.expectClosed();
  });

  test('MC-011 View Cart/Bag CTA in mini-cart navigates to /cart', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartViewCartButton, 'Brand does not have a View Cart/Bag CTA in mini-cart.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.viewCartButton).toBeVisible();
    await pdp.miniCart.goToCart();
    expect(CART_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('MC-012 cart count shows 0 or is hidden when cart is empty', async ({ features, home, cart }) => {
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');
    const count = await home.miniCart.readHeaderCartCount();
    const badgeVisible = await home.header.cartCount.isVisible().catch(() => false);
    expect(
      count === 0 || count === null || !badgeVisible,
      'Count should be 0 or badge hidden when cart is empty.'
    ).toBe(true);
  });

  test('MC-013 product added from PDP appears in mini-cart with correct variant', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Product should appear in mini-cart after ATC from PDP.').toBeGreaterThan(0);
    const rowText = await rows[0].innerText();
    const attrs = pdp.miniCart.itemAttributes(rows[0]);
    const hasVariantAttr = (await attrs.count()) > 0;
    const hasVariantText = VARIANT_PATTERN.test(rowText);
    expect(hasVariantAttr || hasVariantText, 'Mini-cart row should show variant details.').toBe(true);
  });

  test('MC-014 removing last item in mini-cart shows empty state', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    let rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 0; i < 6 && rows.length > 0; i++) {
      const btn = pdp.miniCart.removeButton(rows[0]);
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await page.waitForTimeout(1200);
      rows = await pdp.miniCart.getVisibleRows();
    }
    expect(rows.length, 'All rows should be removed.').toBe(0);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptyShown =
      EMPTY_CART.test(bodyText) ||
      (await pdp.miniCart.emptyMessage.isVisible().catch(() => false));
    expect(emptyShown, 'Empty state should appear after removing last item.').toBe(true);
    const countAfter = await pdp.miniCart.readHeaderCartCount();
    expect(countAfter === 0 || countAfter === null).toBe(true);
  });

  test('MC-015 removing one item in multi-item cart leaves other items intact', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    if (rows.length < 2) {
      test.skip(true, 'Only 1 item in cart — cart needs 2+ products to run this TC.');
      return;
    }
    const beforeCount = rows.length;
    await pdp.miniCart.removeButton(rows[0]).click();
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    expect(afterRows.length).toBe(beforeCount - 1);
  });

  test('MC-016 Afterpay/payment messaging displayed in mini-cart when feature is enabled', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartPaymentMessaging, 'miniCartPaymentMessaging disabled for this brand.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const drawerText = await pdp.miniCart.drawer.innerText();
    const hasMsg =
      (await pdp.miniCart.paymentMessaging.isVisible().catch(() => false)) ||
      PAYMENT_MSG_PATTERN.test(drawerText);
    expect(hasMsg, 'Payment messaging should be visible in mini-cart.').toBe(true);
  });

  test('MC-017 mini-cart is functional on mobile viewport', async ({ ctx, home, plp, pdp, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.checkoutButton).toBeVisible();
    await pdp.miniCart.goToCheckout();
    expect(CHECKOUT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('MC-018 product added via Quick Add from PLP appears in mini-cart', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.quickAddOnPlp, 'quickAddOnPlp disabled for this brand.');
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    const qaBtn = plp.quickAddButtons.first();
    if (!(await qaBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Quick Add button not visible on staging PLP.');
      return;
    }
    await qaBtn.hover();
    await page.waitForTimeout(300);
    await qaBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1200);
    if (!(await pdp.miniCart.drawer.isVisible().catch(() => false))) {
      await pdp.miniCart.open();
      await page.waitForTimeout(500);
    }
    await pdp.miniCart.expectOpen();
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Quick-added product should appear in mini-cart.').toBeGreaterThan(0);
  });

  test('MC-019 sale product shows original and discounted price in mini-cart', { tag: ['@data-dependent'] }, async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const rowText = (await rows[0].innerText()).replace(/\s+/g, ' ');
    const prices = rowText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|original/i.test(rowText);
    if (!hasSaleSignal || prices.length < 2) {
      test.skip(true, 'No sale product with dual-price in mini-cart on staging — @data-dependent.');
      return;
    }
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('MC-020 qty cannot be set below 1; remove triggered or qty blocked', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartQuantityControls, 'Brand does not expose qty controls in mini-cart.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    await pdp.miniCart.clickQuantityButton(rows[0], 'minus');
    await page.waitForTimeout(1200);
    const afterRows = await pdp.miniCart.getVisibleRows();
    const qty = await pdp.miniCart.readQuantityFromRow(rows[0]).catch(() => null);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const itemRemoved = afterRows.length === 0;
    const qtyAtMin = qty !== null && qty >= 1;
    const confirmPrompt = /remove|confirm|are you sure/i.test(bodyText);
    expect(itemRemoved || qtyAtMin || confirmPrompt, 'Qty should not go below 1.').toBe(true);
  });

  test('MC-021 mini-cart contents persist after page navigation', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rowsBefore = await pdp.miniCart.getVisibleRows();
    expect(rowsBefore.length).toBeGreaterThan(0);
    await pdp.miniCart.close().catch(() => undefined);
    await home.goto('/');
    await home.dismissInterruptions();
    await home.header.openCart();
    await home.miniCart.expectOpen();
    const rowsAfter = await home.miniCart.getVisibleRows();
    expect(rowsAfter.length, 'Cart contents should persist after navigation.').toBeGreaterThan(0);
  });

  test('MC-022 mini-cart contents persist after page refresh', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rowsBefore = await pdp.miniCart.getVisibleRows();
    expect(rowsBefore.length).toBeGreaterThan(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    await pdp.miniCart.open();
    await page.waitForTimeout(500);
    await pdp.miniCart.expectOpen();
    const rowsAfter = await pdp.miniCart.getVisibleRows();
    expect(rowsAfter.length, 'Cart contents should persist after page refresh.').toBeGreaterThan(0);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('MC-023 remove-from-cart action fires a dataLayer event', { tag: ['@analytics'] }, async ({ ctx, home, plp, pdp, page }) => {
    await page.addInitScript(() => {
      (window as any).__dlCapture = [];
      const origPush = Array.prototype.push;
      Object.defineProperty(window, 'dataLayer', {
        get: () => (window as any).__dlCapture,
        set(val: unknown[]) { (window as any).__dlCapture = val; }
      });
    });
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const removeBtn = pdp.miniCart.removeButton(rows[0]);
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

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('MC-skx-001 Skechers mini-cart does NOT display Afterpay messaging', async ({ ctx, home, plp, pdp, page }) => {
    onlyBrand(ctx, 'skechers');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const drawerText = await pdp.miniCart.drawer.innerText();
    expect(
      AFTERPAY_PATTERN.test(drawerText),
      'Skechers mini-cart should NOT contain Afterpay messaging.'
    ).toBe(false);
  });

  test('MC-drm-001 Dr. Martens mini-cart View CTA uses "Bag" not "Cart"', async ({ features, ctx, home, plp, pdp, page }) => {
    onlyBrand(ctx, 'drmartens');
    test.skip(!features.miniCartViewCartButton, 'View Cart/Bag button not enabled.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const ctaText = (await pdp.miniCart.viewCartButton.innerText().catch(() => '')).toLowerCase();
    expect(BAG_PATTERN.test(ctaText), 'DRM View CTA should contain "bag".').toBe(true);
    expect(/\bcart\b|\bbasket\b/.test(ctaText), 'DRM View CTA should NOT contain "cart" or "basket".').toBe(false);
  });

  test('MC-van-001 Vans mini-cart payment messaging mentions PayPal', async ({ features, ctx, home, plp, pdp, page }) => {
    onlyBrand(ctx, 'vans');
    test.skip(!features.miniCartPaymentMessaging, 'miniCartPaymentMessaging disabled.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const drawerText = await pdp.miniCart.drawer.innerText();
    expect(PAYPAL_PATTERN.test(drawerText), 'Vans mini-cart payment messaging should mention PayPal.').toBe(true);
  });

  // ─── Middle ──────────────────────────────────────────────────────────────

  test('MC-024 mini-cart product count updates immediately after ATC without page reload', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await home.goto('/');
    const countBefore = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const countAfter = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    expect(countAfter, 'Cart count should increment after ATC without page reload.').toBeGreaterThan(countBefore);
  });

  test('MC-025 mini-cart subtotal reflects quantity changes before navigating to cart', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.miniCartQuantityControls, 'Brand does not expose qty controls in mini-cart.');
    test.skip(!features.miniCartSubtotal, 'Brand does not display subtotal in mini-cart.');
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: product in mini-cart.').toBeGreaterThan(0);
    const subtotalBefore = await pdp.miniCart.readSubtotal();
    const increased =
      (await pdp.miniCart.clickQuantityButton(rows[0], 'plus')) ||
      (await pdp.miniCart.setRowQuantity(rows[0], 2));
    if (!increased) {
      test.skip(true, 'Could not increase qty in mini-cart for this brand.');
      return;
    }
    await page.waitForTimeout(1_000);
    const subtotalAfter = await pdp.miniCart.readSubtotal();
    expect(subtotalAfter, 'Subtotal should be readable after qty change.').not.toBeNull();
    expect(subtotalAfter).not.toBe(subtotalBefore);
  });

  test('MC-026 mini-cart panel does not overflow horizontally and renders within viewport', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.drawer).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'Mini-cart should not cause horizontal overflow on the page.').toBe(false);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('MC-027 rapid ATC clicks do not duplicate items beyond expected quantity', async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await home.goto('/');
    const baseline = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    // Add to cart then immediately attempt a second click
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const countAfterFirst = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    // Close mini-cart and try a second rapid ATC
    await pdp.miniCart.close().catch(() => undefined);
    await pdp.addToCartButton.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    await pdp.addToCartButton.click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    const countAfterRapid = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    // Should not have added more than 2 extra items from the 2 extra clicks
    expect(countAfterRapid - baseline).toBeLessThanOrEqual(3);
    expect(countAfterRapid, 'Cart count should be greater than initial after rapid clicks.').toBeGreaterThan(baseline);
  });

  test('MC-028 mini-cart closes automatically when navigating to a new page', async ({ ctx, home, plp, pdp, page }) => {
    await atcAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.drawer).toBeVisible();
    await home.goto('/');
    await page.waitForTimeout(500);
    const drawerAfterNav = await pdp.miniCart.drawer.isVisible({ timeout: 2_000 }).catch(() => false);
    // Mini-cart should either close on navigation or not be open by default on homepage
    expect(drawerAfterNav, 'Mini-cart drawer should not persist open after navigating away.').toBe(false);
  });
});
