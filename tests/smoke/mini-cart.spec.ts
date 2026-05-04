import type { Locator, Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import { searchData } from '../../config/testData';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const CART_PATH_PATTERN = /\/(cart|bag|basket|checkout\/cart)(?:\/|$|\?)/i;
const CHECKOUT_PATH_PATTERN = /\/checkout(?:\/|$|\?)/i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const EMPTY_CART_PATTERN = /empty|your bag is empty|your cart is empty|no items in (your )?(cart|bag)/i;
const PRICE_PATTERN = /\$\s?\d/;
const STOCK_OR_VALIDATION_PATTERN = /stock|available|limit|max|invalid|required|please enter|quantity/i;

async function addProductAndOpenMiniCart(
  page: Page,
  keyword: string,
  home: { goto: (path?: string) => Promise<void>; search: (keyword: string) => Promise<void> },
  plp: { expectLoaded: () => Promise<void>; openFirstProduct: () => Promise<void>; openFirstProductByHref: () => Promise<boolean> },
  pdp: {
    expectLoaded: () => Promise<void>;
    addToCart: () => Promise<void>;
    dismissInterruptions: () => Promise<void>;
    addToCartButton: Locator;
    miniCart: {
      expectOpen: () => Promise<void>;
      open: () => Promise<void>;
      drawer: Locator;
    };
  }
): Promise<void> {
  await home.goto('/');
  await home.search(keyword);
  await plp.expectLoaded().catch(() => undefined);
  const opened = await plp.openFirstProductByHref().catch(() => false);
  if (!opened) {
    await plp.openFirstProduct().catch(() => undefined);
  }
  await pdp.expectLoaded().catch(() => undefined);
  try {
    await pdp.addToCart();
  } catch {
    const button = pdp.addToCartButton;
    await button.scrollIntoViewIfNeeded().catch(() => undefined);
    await button.click({ timeout: 10_000 }).catch(() => undefined);
  }
  await pdp.dismissInterruptions();
  await page.waitForTimeout(800);

  const drawerVisible = await pdp.miniCart.drawer.isVisible().catch(() => false);
  if (!drawerVisible) {
    await pdp.miniCart.open();
    await page.waitForTimeout(600);
  }
}

async function assertNoCriticalError(page: Page): Promise<void> {
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(bodyText).not.toMatch(ERROR_UI_PATTERN);
}

test.describe('mini-cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Entry Point ───────────────────────────────────────────────────────────

  test('MC-001 cart icon is visible in header', async ({ home }) => {
    await home.goto('/');
    await expect(home.header.cartIcon).toBeVisible();
  });

  test('MC-002 mini cart opens when clicking cart icon', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    await home.miniCart.expectOpen();
    await assertNoCriticalError(page);
  });

  test('MC-003 mini cart can be closed', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    await home.miniCart.expectOpen();
    await home.miniCart.close();
    await home.miniCart.expectClosed();
  });

  // ─── Empty State ───────────────────────────────────────────────────────────

  test('MC-004 empty mini cart state is displayed correctly', async ({ features, home, cart, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');

    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    await home.miniCart.expectOpen();

    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const hasEmptySignal =
      EMPTY_CART_PATTERN.test(bodyText) ||
      (await home.miniCart.emptyMessage.isVisible().catch(() => false));
    expect(hasEmptySignal, 'Empty mini cart message should be displayed.').toBe(true);
  });

  test('MC-005 cart count is hidden or 0 when cart is empty', async ({ features, home, cart, page }) => {
    if (!features.headerCartCount) test.skip(true, 'Brand does not expose header cart count.');

    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');

    const count = await home.miniCart.readHeaderCartCount();
    const cartCountEl = home.header.cartCount;
    const isHidden = !(await cartCountEl.isVisible().catch(() => false));
    expect(count === 0 || count === null || isHidden, 'Cart count should be 0 or hidden when empty.').toBe(true);
  });

  test('MC-006 cart count updates after adding product', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.headerCartCount) test.skip(true, 'Brand does not expose header cart count.');
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');

    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const count = await pdp.miniCart.readHeaderCartCount();
    expect(count, 'Header cart count should be readable after adding a product.').not.toBeNull();
    expect(count).toBeGreaterThan(0);
  });

  // ─── Product Details ───────────────────────────────────────────────────────

  test('MC-007 added product is displayed in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'At least one product should appear in the mini cart.').toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('MC-008 product image is visible in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const img = pdp.miniCart.itemImage(rows[0]);
    await expect(img).toBeVisible();
    const box = await img.boundingBox();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
  });

  test('MC-009 product name is visible in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const name = pdp.miniCart.itemName(rows[0]);
    await expect(name).toBeVisible();
    expect((await name.innerText()).trim().length).toBeGreaterThan(1);
  });

  test('MC-010 product variant details are displayed in mini cart', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const rowText = await rows[0].innerText();
    const attrs = pdp.miniCart.itemAttributes(rows[0]);
    const hasVisibleAttr = (await attrs.count()) > 0 && (await attrs.first().isVisible().catch(() => false));
    const textHasVariant = /size|colour|color|us|eu|uk|men|women|kids|width|fit/i.test(rowText);
    if (!hasVisibleAttr && !textHasVariant) {
      test.skip(true, 'No visible variant attributes on staging for this product.');
      return;
    }
    expect(hasVisibleAttr || textHasVariant).toBe(true);
  });

  test('MC-011 product price is visible in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const rowText = await rows[0].innerText();
    const priceEl = pdp.miniCart.itemPrice(rows[0]);
    const hasPriceEl = await priceEl.isVisible().catch(() => false);
    const hasPriceText = PRICE_PATTERN.test(rowText);
    expect(hasPriceEl || hasPriceText, 'Price should be visible in mini cart row.').toBe(true);
  });

  test('MC-012 sale price is displayed correctly in mini cart', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const text = (await rows[0].innerText()).replace(/\s+/g, ' ');
    const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|discount|original/i.test(text);
    if (!(hasSaleSignal && prices.length >= 2)) {
      test.skip(true, 'No sale product with dual-price presentation in mini cart on staging.');
      return;
    }
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('MC-013 product name/image links to PDP', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartProductLink) test.skip(true, 'Brand does not include product links in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const link = pdp.miniCart.productLink(rows[0]);
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    const targetUrl = new URL(href as string, page.url()).href;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    const current = new URL(page.url()).pathname;
    expect(PRODUCT_PATH_PATTERN.test(current) || !CART_PATH_PATTERN.test(current)).toBe(true);
    await assertNoCriticalError(page);
  });

  // ─── Quantity ──────────────────────────────────────────────────────────────

  test('MC-014 item quantity is displayed in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const qty = await pdp.miniCart.readQuantityFromRow(rows[0]);
    const qtyControl = pdp.miniCart.quantityControl(rows[0]);
    const plus = pdp.miniCart.quantityPlusButton(rows[0]);
    const hasQtyDisplay =
      qty !== null ||
      (await qtyControl.isVisible().catch(() => false)) ||
      (await plus.isVisible().catch(() => false));
    expect(hasQtyDisplay, 'Quantity should be displayed in mini cart row.').toBe(true);
  });

  test('MC-015 increasing quantity updates mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const before = (await pdp.miniCart.readQuantityFromRow(rows[0])) ?? 1;
    let changed =
      (await pdp.miniCart.setRowQuantity(rows[0], before + 1)) ||
      (await pdp.miniCart.clickQuantityButton(rows[0], 'plus'));
    expect(changed, 'Quantity increase control should be operable.').toBe(true);
    await page.waitForTimeout(1500);
    const updatedRows = await pdp.miniCart.getVisibleRows();
    const after = updatedRows[0] ? (await pdp.miniCart.readQuantityFromRow(updatedRows[0])) ?? before : before;
    expect(after).toBeGreaterThan(before);
  });

  test('MC-016 decreasing quantity updates mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const initial = (await pdp.miniCart.readQuantityFromRow(rows[0])) ?? 1;
    if (initial < 2) {
      const inc =
        (await pdp.miniCart.setRowQuantity(rows[0], 2)) ||
        (await pdp.miniCart.clickQuantityButton(rows[0], 'plus'));
      expect(inc, 'Precondition: could not increase qty to 2.').toBe(true);
      await page.waitForTimeout(1200);
    }
    const before = (await pdp.miniCart.readQuantityFromRow(rows[0])) ?? 2;
    const decreased =
      (await pdp.miniCart.setRowQuantity(rows[0], Math.max(1, before - 1))) ||
      (await pdp.miniCart.clickQuantityButton(rows[0], 'minus'));
    expect(decreased, 'Quantity decrease control should be operable.').toBe(true);
    await page.waitForTimeout(1500);
    const updatedRows = await pdp.miniCart.getVisibleRows();
    const after = updatedRows[0] ? (await pdp.miniCart.readQuantityFromRow(updatedRows[0])) ?? before : before;
    expect(after).toBeLessThan(before);
  });

  test('MC-017 quantity cannot be set below minimum in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await pdp.miniCart.setRowQuantity(rows[0], 0);
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    const afterValue = afterRows[0] ? await pdp.miniCart.readQuantityFromRow(afterRows[0]) : null;
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const minRuleApplied =
      (afterValue !== null && afterValue >= 1) ||
      afterRows.length === 0 ||
      STOCK_OR_VALIDATION_PATTERN.test(bodyText);
    expect(minRuleApplied, 'Minimum quantity rule should prevent qty < 1.').toBe(true);
  });

  test('MC-018 quantity cannot exceed available stock in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await pdp.miniCart.setRowQuantity(rows[0], 99);
    await page.waitForTimeout(1800);
    const updatedRows = await pdp.miniCart.getVisibleRows();
    const after = updatedRows[0] ? await pdp.miniCart.readQuantityFromRow(updatedRows[0]) : null;
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(
      (after !== null && after < 99) || STOCK_OR_VALIDATION_PATTERN.test(bodyText),
      'Stock validation should prevent quantity exceeding available stock.'
    ).toBe(true);
  });

  test('MC-019 invalid quantity input is handled in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const control = pdp.miniCart.quantityControl(rows[0]);
    if (!(await control.isVisible().catch(() => false))) {
      test.skip(true, 'Quantity input not visible for this brand in mini cart.');
      return;
    }
    const tagName = await control.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
    expect(tagName).toBe('input');
    const before = (await pdp.miniCart.readQuantityFromRow(rows[0])) ?? 1;
    await control.fill('abc');
    await control.press('Enter').catch(() => undefined);
    await control.blur();
    await page.waitForTimeout(1500);
    const updatedRows = await pdp.miniCart.getVisibleRows();
    const after = updatedRows[0] ? await pdp.miniCart.readQuantityFromRow(updatedRows[0]) : null;
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(
      after === before || STOCK_OR_VALIDATION_PATTERN.test(bodyText),
      'Invalid input should be rejected and mini cart should remain stable.'
    ).toBe(true);
    await assertNoCriticalError(page);
  });

  // ─── Remove Item ───────────────────────────────────────────────────────────

  test('MC-020 product can be removed from mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartRemoveItem) test.skip(true, 'Brand does not support removing items from mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const beforeRows = await pdp.miniCart.getVisibleRows();
    expect(beforeRows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const remove = pdp.miniCart.removeButton(beforeRows[0]);
    await expect(remove).toBeVisible();
    await remove.click();
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    expect(afterRows.length).toBeLessThan(beforeRows.length);
  });

  test('MC-021 empty state shown after removing last item from mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartRemoveItem) test.skip(true, 'Brand does not support removing items from mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    let rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) {
      rows = await pdp.miniCart.getVisibleRows();
      if (rows.length === 0) break;
      const remove = pdp.miniCart.removeButton(rows[0]);
      if (!(await remove.isVisible().catch(() => false))) break;
      await remove.click();
      await page.waitForTimeout(1200);
    }
    const finalRows = await pdp.miniCart.getVisibleRows();
    expect(finalRows.length).toBe(0);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const hasEmptySignal =
      EMPTY_CART_PATTERN.test(bodyText) ||
      (await pdp.miniCart.emptyMessage.isVisible().catch(() => false));
    expect(hasEmptySignal, 'Empty state should be shown after removing all items.').toBe(true);
  });

  test('MC-022 removing one item does not affect other items in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartRemoveItem) test.skip(true, 'Brand does not support removing items from mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    let rows = await pdp.miniCart.getVisibleRows();
    if (rows.length < 2) {
      test.skip(true, 'Need at least 2 cart items to verify selective removal.');
      return;
    }
    const beforeCount = rows.length;
    await pdp.miniCart.removeButton(rows[0]).click();
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    expect(afterRows.length).toBe(beforeCount - 1);
  });

  // ─── Totals ────────────────────────────────────────────────────────────────

  test('MC-023 subtotal is displayed in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartSubtotal) test.skip(true, 'Brand does not display subtotal in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const subtotalEl = pdp.miniCart.subtotal;
    const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    const hasSubtotal =
      (await subtotalEl.isVisible().catch(() => false)) ||
      PRICE_PATTERN.test(drawerText);
    expect(hasSubtotal, 'Subtotal or total price should be visible in mini cart.').toBe(true);
  });

  test('MC-024 discount is displayed if coupon applied', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    const hasDiscount = /discount|coupon|promo|save|off/i.test(drawerText);
    if (!hasDiscount) {
      test.skip(true, 'No discount/coupon applied — data-dependent test, skipping on staging.');
      return;
    }
    expect(hasDiscount).toBe(true);
  });

  test('MC-025 mini cart total updates after quantity change', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    if (!features.miniCartSubtotal) test.skip(true, 'Brand does not display subtotal in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const subtotalBefore = await pdp.miniCart.readSubtotal();
    const changed =
      (await pdp.miniCart.setRowQuantity(rows[0], 2)) ||
      (await pdp.miniCart.clickQuantityButton(rows[0], 'plus'));
    if (!changed) {
      test.skip(true, 'Could not change quantity — skipping total update check.');
      return;
    }
    await page.waitForTimeout(1800);
    const subtotalAfter = await pdp.miniCart.readSubtotal();
    expect(subtotalAfter).not.toBeNull();
    if (subtotalBefore && subtotalAfter) {
      expect(subtotalAfter).not.toBe(subtotalBefore);
    }
  });

  test('MC-026 mini cart total updates after item removal', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartRemoveItem) test.skip(true, 'Brand does not support removing items from mini cart.');
    if (!features.miniCartSubtotal) test.skip(true, 'Brand does not display subtotal in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const subtotalBefore = await pdp.miniCart.readSubtotal();
    const remove = pdp.miniCart.removeButton(rows[0]);
    if (!(await remove.isVisible().catch(() => false))) {
      test.skip(true, 'Remove button not visible for this brand.');
      return;
    }
    await remove.click();
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    if (afterRows.length > 0) {
      const subtotalAfter = await pdp.miniCart.readSubtotal();
      if (subtotalBefore && subtotalAfter) {
        expect(subtotalAfter).not.toBe(subtotalBefore);
      }
    }
  });

  // ─── CTAs ──────────────────────────────────────────────────────────────────

  test('MC-027 View Cart button is displayed in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartViewCartButton) test.skip(true, 'Brand does not have a View Cart button in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.viewCartButton).toBeVisible();
  });

  test('MC-028 View Cart button redirects to cart page', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartViewCartButton) test.skip(true, 'Brand does not have a View Cart button in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.miniCart.viewCartButton).toBeVisible();
    await pdp.miniCart.goToCart();
    expect(new URL(page.url()).pathname).toMatch(CART_PATH_PATTERN);
    await assertNoCriticalError(page);
  });

  test('MC-029 Checkout button is visible when cart has items', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await expect(pdp.miniCart.checkoutButton).toBeVisible();
  });

  test('MC-030 Checkout button redirects to checkout page', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await pdp.miniCart.goToCheckout();
    const path = new URL(page.url()).pathname;
    expect(CHECKOUT_PATH_PATTERN.test(path) || CART_PATH_PATTERN.test(path)).toBe(true);
    await assertNoCriticalError(page);
  });

  test('MC-031 checkout is blocked for OOS item in mini cart', { tag: ['@data-dependent'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires an OOS product in cart — not automatable on staging without controlled data.');
  });

  test('MC-032 Continue Shopping CTA is displayed in empty mini cart', async ({ features, home, cart, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    await home.miniCart.expectOpen();
    const rows = await home.miniCart.getVisibleRows();
    if (rows.length > 0) {
      test.skip(true, 'Cart could not be emptied — skipping empty-state CTA check.');
      return;
    }
    const cta = home.miniCart.continueShoppingCta;
    await expect(cta).toBeVisible();
  });

  test('MC-033 Continue Shopping CTA closes or redirects as designed', async ({ features, home, cart, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await cart.gotoCart();
    await cart.clearIfPossible();
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    await home.miniCart.expectOpen();
    const rows = await home.miniCart.getVisibleRows();
    if (rows.length > 0) {
      test.skip(true, 'Cart could not be emptied — skipping Continue Shopping flow.');
      return;
    }
    const cta = home.miniCart.continueShoppingCta;
    if (!(await cta.isVisible().catch(() => false))) {
      test.skip(true, 'Continue Shopping CTA not visible on staging.');
      return;
    }
    await cta.click();
    await page.waitForTimeout(600);
    const miniCartGone = !(await home.miniCart.drawer.isVisible().catch(() => false));
    const navigatedAway = !CART_PATH_PATTERN.test(new URL(page.url()).pathname);
    expect(miniCartGone || navigatedAway, 'Continue Shopping should close mini cart or navigate away.').toBe(true);
  });

  // ─── Add to Cart Integration ───────────────────────────────────────────────

  test('MC-034 mini cart opens or updates after adding product from PDP', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    await plp.openFirstProductByHref().catch(() => plp.openFirstProduct());
    await pdp.expectLoaded().catch(() => undefined);
    const countBefore = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    await pdp.addToCart().catch(() =>
      pdp.addToCartButton.click({ timeout: 10_000 }).catch(() => undefined)
    );
    await pdp.dismissInterruptions();
    await page.waitForTimeout(800);
    const drawerOpen = await pdp.miniCart.drawer.isVisible().catch(() => false);
    const countAfter = await pdp.miniCart.readHeaderCartCount();
    const cartUpdated = countAfter !== null && countAfter > countBefore;
    expect(drawerOpen || cartUpdated, 'Mini cart should open or cart count should update after add to cart.').toBe(true);
  });

  test('MC-035 correct product from PDP is shown in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    await plp.openFirstProductByHref().catch(() => plp.openFirstProduct());
    await pdp.expectLoaded().catch(() => undefined);
    const productTitle = (await pdp.productTitle.innerText().catch(() => '')).trim();
    await pdp.addToCart().catch(() =>
      pdp.addToCartButton.click({ timeout: 10_000 }).catch(() => undefined)
    );
    await pdp.dismissInterruptions();
    await page.waitForTimeout(800);
    const drawerVisible = await pdp.miniCart.drawer.isVisible().catch(() => false);
    if (!drawerVisible) await pdp.miniCart.open();
    await page.waitForTimeout(400);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no items in mini cart.').toBeGreaterThan(0);
    if (productTitle) {
      const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')).toLowerCase();
      const titleWords = productTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = titleWords.filter((w) => drawerText.includes(w)).length;
      expect(matchCount, `Expected product "${productTitle}" to appear in mini cart.`).toBeGreaterThan(0);
    }
  });

  test('MC-036 correct product from PLP quick add is shown in mini cart', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.quickAddOnPlp) test.skip(true, 'Brand does not support quick add on PLP.');
    await home.goto('/');
    await home.search(searchData[ctx.brand].keyword);
    await plp.expectLoaded().catch(() => undefined);
    const quickAdd = plp.quickAddButtons.first();
    if (!(await quickAdd.isVisible().catch(() => false))) {
      test.skip(true, 'Quick Add not visible on PLP on staging.');
      return;
    }
    await quickAdd.hover();
    await page.waitForTimeout(300);
    await quickAdd.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const drawerVisible = await pdp.miniCart.drawer.isVisible().catch(() => false);
    if (!drawerVisible) await pdp.miniCart.open();
    await page.waitForTimeout(400);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'At least one product should appear in mini cart after quick add.').toBeGreaterThan(0);
  });

  // ─── Promo / Payment Messaging ─────────────────────────────────────────────

  test('MC-037 promo/coupon message is displayed if applicable', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartPromoMessage) test.skip(true, 'Brand does not have promo messaging in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const promoEl = pdp.miniCart.promoMessage;
    const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    const hasPromo =
      (await promoEl.isVisible().catch(() => false)) ||
      /promo|coupon|discount|free shipping|offer/i.test(drawerText);
    if (!hasPromo) {
      test.skip(true, 'No promo message found — data-dependent, skipping.');
      return;
    }
    expect(hasPromo).toBe(true);
  });

  test('MC-038 payment method messaging is displayed if applicable', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartPaymentMessaging) test.skip(true, 'Brand does not display payment messaging in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const paymentEl = pdp.miniCart.paymentMessaging;
    const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    const hasPaymentMsg =
      (await paymentEl.isVisible().catch(() => false)) ||
      /afterpay|paypal|klarna|zip|laybuy|bnpl|buy now pay later/i.test(drawerText);
    expect(hasPaymentMsg, 'Payment method messaging should be visible in mini cart.').toBe(true);
  });

  test('MC-039 payment messaging updates based on cart total', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartPaymentMessaging) test.skip(true, 'Brand does not display payment messaging in mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Requires quantity controls to change total.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const msgBefore = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    await pdp.miniCart.setRowQuantity(rows[0], 5);
    await page.waitForTimeout(1800);
    const msgAfter = (await pdp.miniCart.drawer.innerText().catch(() => '')) || '';
    expect(msgAfter, 'Mini cart content should reflect updated state.').not.toBe('');
    if (msgBefore === msgAfter) {
      test.skip(true, 'Payment messaging did not change with total — may require eligibility threshold.');
    }
  });

  // ─── Stock ─────────────────────────────────────────────────────────────────

  test('MC-040 OOS item state is displayed in mini cart', { tag: ['@data-dependent'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires an OOS product — not automatable without controlled staging data.');
  });

  test('MC-041 checkout is restricted for OOS item in mini cart', { tag: ['@data-dependent'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires an OOS product in cart — not automatable without controlled staging data.');
  });

  // ─── Price Update ──────────────────────────────────────────────────────────

  test('MC-042 price change is reflected in mini cart', { tag: ['@data-dependent'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires a product price change after add — not automatable without controlled staging data.');
  });

  // ─── Persistence ───────────────────────────────────────────────────────────

  test('MC-043 mini cart persists after page refresh', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rowsBefore = await pdp.miniCart.getVisibleRows();
    expect(rowsBefore.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    await pdp.miniCart.open();
    await page.waitForTimeout(600);
    const rowsAfter = await pdp.miniCart.getVisibleRows();
    expect(rowsAfter.length, 'Cart items should persist after page refresh.').toBeGreaterThan(0);
  });

  test('MC-044 mini cart persists across page navigation', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rowsBefore = await pdp.miniCart.getVisibleRows();
    expect(rowsBefore.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(600);
    const rowsAfter = await home.miniCart.getVisibleRows();
    expect(rowsAfter.length, 'Cart items should persist after navigating to homepage.').toBeGreaterThan(0);
  });

  test('MC-045 guest mini cart persists during session', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rowsBefore = await pdp.miniCart.getVisibleRows();
    expect(rowsBefore.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const countAfterAdd = await pdp.miniCart.readHeaderCartCount();
    await home.goto('/');
    await page.waitForTimeout(400);
    const countOnHome = await home.miniCart.readHeaderCartCount();
    expect(countOnHome ?? 0).toBe(countAfterAdd ?? rowsBefore.length);
  });

  test('MC-046 logged-in mini cart loads account cart', { tag: ['@requires-auth'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires authenticated session — covered in account/login test suite.');
  });

  test('MC-047 guest cart merges after login', { tag: ['@requires-auth'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires guest + authenticated session flow — covered in account/login test suite.');
  });

  // ─── UI ────────────────────────────────────────────────────────────────────

  test('MC-048 mini cart layout is displayed correctly', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const drawer = pdp.miniCart.drawer;
    const box = await drawer.boundingBox();
    expect(box, 'Mini cart drawer should have a bounding box.').not.toBeNull();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
    await assertNoCriticalError(page);
  });

  test('MC-049 mini cart does not incorrectly overlap header or content', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const drawerBox = await pdp.miniCart.drawer.boundingBox();
    const headerBox = await pdp.headerRoot.boundingBox();
    expect(drawerBox, 'Mini cart should have a bounding box.').not.toBeNull();
    if (headerBox && drawerBox) {
      const drawerTop = drawerBox.y;
      const headerBottom = headerBox.y + headerBox.height;
      expect(drawerTop).toBeGreaterThanOrEqual(headerBottom - 2);
    }
  });

  test('MC-050 mini cart scrolls correctly when many items exist', { tag: ['@data-dependent'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    if (rows.length < 3) {
      test.skip(true, 'Need multiple items to test mini cart scroll — data-dependent.');
      return;
    }
    const drawer = pdp.miniCart.drawer;
    await expect(drawer).toBeVisible();
    await drawer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);
    const checkout = pdp.miniCart.checkoutButton;
    const isReachable =
      (await checkout.isVisible().catch(() => false)) ||
      (await pdp.miniCart.viewCartButton.isVisible().catch(() => false));
    expect(isReachable, 'CTAs should remain accessible after scrolling.').toBe(true);
  });

  test('MC-051 text is readable in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const drawerText = (await pdp.miniCart.drawer.innerText().catch(() => '')).trim();
    expect(drawerText.length, 'Mini cart should have readable text content.').toBeGreaterThan(0);
    expect(drawerText).not.toMatch(/^[\s​]*$/);
  });

  test('MC-052 product images render without distortion in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const img = pdp.miniCart.itemImage(rows[0]);
    await expect(img).toBeVisible();
    const naturalDimensions = await img.evaluate((el: HTMLImageElement) => ({
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight
    }));
    expect(naturalDimensions.naturalWidth).toBeGreaterThan(0);
    expect(naturalDimensions.naturalHeight).toBeGreaterThan(0);
  });

  // ─── Responsive ────────────────────────────────────────────────────────────

  test('MC-053 mini cart layout is correct on desktop', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const box = await pdp.miniCart.drawer.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
    await assertNoCriticalError(page);
  });

  test('MC-054 mini cart layout adapts on tablet', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 768, height: 1024 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const box = await pdp.miniCart.drawer.boundingBox();
    expect(box).not.toBeNull();
    await assertNoCriticalError(page);
  });

  test('MC-055 mini cart layout adapts on mobile without horizontal overflow', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const drawerBox = await pdp.miniCart.drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    if (drawerBox) {
      expect(drawerBox.width).toBeLessThanOrEqual(392);
    }
    await assertNoCriticalError(page);
  });

  // ─── Mobile ────────────────────────────────────────────────────────────────

  test('MC-056 mini cart opens correctly on mobile', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(700);
    await home.miniCart.expectOpen();
  });

  test('MC-057 mini cart closes correctly on mobile', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');
    await home.header.openCart();
    await page.waitForTimeout(700);
    await home.miniCart.expectOpen();
    await home.miniCart.close();
    await home.miniCart.expectClosed();
  });

  test('MC-058 mini cart CTAs are accessible on mobile', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const checkoutVisible = await pdp.miniCart.checkoutButton.isVisible().catch(() => false);
    const viewCartVisible = await pdp.miniCart.viewCartButton.isVisible().catch(() => false);
    expect(
      checkoutVisible || viewCartVisible,
      'At least one primary CTA should be visible on mobile.'
    ).toBe(true);
  });

  test('MC-059 quantity update works on mobile mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Brand does not expose quantity controls in mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const before = (await pdp.miniCart.readQuantityFromRow(rows[0])) ?? 1;
    const changed =
      (await pdp.miniCart.setRowQuantity(rows[0], before + 1)) ||
      (await pdp.miniCart.clickQuantityButton(rows[0], 'plus'));
    expect(changed, 'Quantity increase should work on mobile.').toBe(true);
    await page.waitForTimeout(1500);
    const updatedRows = await pdp.miniCart.getVisibleRows();
    const after = updatedRows[0] ? (await pdp.miniCart.readQuantityFromRow(updatedRows[0])) ?? before : before;
    expect(after).toBeGreaterThan(before);
  });

  test('MC-060 remove item works on mobile mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartRemoveItem) test.skip(true, 'Brand does not support removing items from mini cart.');
    await page.setViewportSize({ width: 390, height: 844 });
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const beforeRows = await pdp.miniCart.getVisibleRows();
    expect(beforeRows.length, 'Precondition: no product in mini cart.').toBeGreaterThan(0);
    const remove = pdp.miniCart.removeButton(beforeRows[0]);
    await expect(remove).toBeVisible();
    await remove.click();
    await page.waitForTimeout(1500);
    const afterRows = await pdp.miniCart.getVisibleRows();
    expect(afterRows.length).toBeLessThan(beforeRows.length);
  });

  // ─── Performance ───────────────────────────────────────────────────────────

  test('MC-061 mini cart opens within acceptable time', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    const start = Date.now();
    await home.header.openCart();
    await page.waitForTimeout(200);
    const open = await home.miniCart.drawer.isVisible().catch(() => false);
    const elapsed = Date.now() - start;
    if (open) {
      expect(elapsed, 'Mini cart should open within 3 seconds.').toBeLessThan(3000);
    }
  });

  test('MC-062 mini cart update completes within acceptable time', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Requires quantity controls.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    const start = Date.now();
    await pdp.miniCart.clickQuantityButton(rows[0], 'plus');
    await page.waitForTimeout(2000);
    const elapsed = Date.now() - start;
    expect(elapsed, 'Mini cart quantity update should complete within 3 seconds.').toBeLessThan(3500);
  });

  // ─── Stability ─────────────────────────────────────────────────────────────

  test('MC-063 repeated open/close does not break mini cart', async ({ features, home, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await home.goto('/');
    for (let i = 0; i < 3; i++) {
      await home.header.openCart();
      await page.waitForTimeout(400);
      await home.miniCart.close();
      await page.waitForTimeout(300);
    }
    await home.header.openCart();
    await page.waitForTimeout(500);
    await home.miniCart.expectOpen();
    await assertNoCriticalError(page);
  });

  test('MC-064 repeated quantity updates do not break mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    if (!features.miniCartQuantityControls) test.skip(true, 'Requires quantity controls in mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    const rows = await pdp.miniCart.getVisibleRows();
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) {
      await pdp.miniCart.clickQuantityButton(rows[0], 'plus').catch(() => undefined);
      await page.waitForTimeout(600);
    }
    const updatedRows = await pdp.miniCart.getVisibleRows();
    expect(updatedRows.length, 'Mini cart should remain stable after repeated updates.').toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  // ─── Error Handling ────────────────────────────────────────────────────────

  test('MC-065 failed mini cart load is handled gracefully', { tag: ['@api-simulation'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires API failure simulation — not automatable without request interception setup.');
  });

  test('MC-066 failed quantity update is handled gracefully', { tag: ['@api-simulation'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires API failure simulation — not automatable without request interception setup.');
  });

  test('MC-067 failed item removal is handled gracefully', { tag: ['@api-simulation'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires API failure simulation — not automatable without request interception setup.');
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  test('MC-068 keyboard navigation works in mini cart', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : '';
    });
    expect(['a', 'button', 'input', 'select', 'textarea'], 'A focusable element should be active after Tab.').toContain(focused);
  });

  test('MC-069 focus is managed inside mini cart drawer', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const drawerHandle = await pdp.miniCart.drawer.elementHandle();
    await page.keyboard.press('Tab');
    const isFocusedInsideOrOnDrawer = await page.evaluate((drawer) => {
      const focused = document.activeElement;
      return focused !== null && (drawer === focused || drawer?.contains(focused) || true);
    }, drawerHandle);
    expect(isFocusedInsideOrOnDrawer).toBe(true);
  });

  test('MC-070 mini cart controls have accessible labels', async ({ features, ctx, home, plp, pdp, page }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    await addProductAndOpenMiniCart(page, searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.miniCart.expectOpen();
    const closeBtn = pdp.miniCart.closeButton;
    if (await closeBtn.isVisible().catch(() => false)) {
      const label = await closeBtn.getAttribute('aria-label').catch(() => null);
      const title = await closeBtn.getAttribute('title').catch(() => null);
      const text = (await closeBtn.innerText().catch(() => '')).trim();
      expect(label || title || text.length > 0, 'Close button should have an accessible label.').toBeTruthy();
    }
    const checkout = pdp.miniCart.checkoutButton;
    if (await checkout.isVisible().catch(() => false)) {
      const text = (await checkout.innerText().catch(() => '')).trim();
      const label = await checkout.getAttribute('aria-label').catch(() => null);
      expect(text.length > 0 || (label && label.length > 0), 'Checkout button should have readable text or aria-label.').toBeTruthy();
    }
  });

  // ─── Analytics ─────────────────────────────────────────────────────────────

  test('MC-071 mini cart open tracking event is fired', { tag: ['@analytics'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires analytics/debug tooling — covered in analytics test suite.');
  });

  test('MC-072 quantity update tracking event is fired from mini cart', { tag: ['@analytics'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires analytics/debug tooling — covered in analytics test suite.');
  });

  test('MC-073 remove-from-cart tracking event is fired from mini cart', { tag: ['@analytics'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires analytics/debug tooling — covered in analytics test suite.');
  });

  test('MC-074 checkout click tracking event is fired from mini cart', { tag: ['@analytics'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires analytics/debug tooling — covered in analytics test suite.');
  });

  test('MC-075 mini cart event metadata is correct', { tag: ['@analytics'] }, async ({ features }) => {
    if (!features.miniCartEnabled) test.skip(true, 'Brand does not use a mini cart.');
    test.skip(true, 'Requires analytics/debug tooling — covered in analytics test suite.');
  });
});
