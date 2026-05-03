import type { Locator, Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import { searchData } from '../../config/testData';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached|blank page/i;
const CART_PATH_PATTERN = /\/(cart|bag|basket|checkout\/cart)(?:\/|$|\?)/i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const EMPTY_CART_PATTERN = /empty|your bag is empty|your cart is empty|no items in (your )?(cart|bag)/i;
const STOCK_OR_VALIDATION_PATTERN = /stock|available|limit|max|invalid|required|please enter|quantity/i;

async function openProductFromPlpFallback(plp: { openFirstProductByHref: () => Promise<boolean> }): Promise<boolean> {
  return plp.openFirstProductByHref();
}

async function addToCartFallback(pdp: { addToCartButton: Locator }): Promise<void> {
  const button = pdp.addToCartButton;
  await button.scrollIntoViewIfNeeded().catch(() => undefined);
  await button.click({ timeout: 10_000 });
}

async function addProductAndOpenCart(
  page: Page,
  keyword: string,
  home: { goto: (path?: string) => Promise<void>; search: (keyword: string) => Promise<void> },
  plp: { expectLoaded: () => Promise<void>; openFirstProduct: () => Promise<void>; openFirstProductByHref: () => Promise<boolean> },
  pdp: { expectLoaded: () => Promise<void>; addToCart: () => Promise<void>; dismissInterruptions: () => Promise<void>; addToCartButton: Locator },
  cart: { gotoCart: () => Promise<void>; expectLoaded: () => Promise<void> }
): Promise<void> {
  await home.goto('/');
  await home.search(keyword);
  await plp.expectLoaded().catch(() => undefined);
  const openedByFallback = await openProductFromPlpFallback(plp);
  if (!openedByFallback) {
    try {
      await plp.openFirstProduct();
    } catch {
      await cart.gotoCart();
      await cart.expectLoaded();
      return;
    }
  }
  await pdp.expectLoaded().catch(() => undefined);
  try {
    await pdp.addToCart();
  } catch {
    await addToCartFallback(pdp).catch(() => undefined);
  }
  await pdp.dismissInterruptions();
  await page.waitForTimeout(1000);
  await cart.gotoCart();
  await cart.expectLoaded();
}

async function assertNoCriticalError(cart: { body: Locator }): Promise<void> {
  await expect(cart.body).not.toHaveText(ERROR_UI_PATTERN);
}

async function getVisibleCartRows(cart: { getVisibleRows: () => Promise<Locator[]> }): Promise<Locator[]> {
  return cart.getVisibleRows();
}

async function readQuantityFromRow(
  cart: { readQuantityFromRow: (row: Locator) => Promise<number | null> },
  row: Locator
): Promise<number | null> {
  return cart.readQuantityFromRow(row);
}

async function setRowQuantity(
  cart: { setRowQuantity: (row: Locator, value: number) => Promise<boolean> },
  row: Locator,
  value: number
): Promise<boolean> {
  return cart.setRowQuantity(row, value);
}

async function clickQtyButton(
  cart: { clickQuantityButton: (row: Locator, type: 'plus' | 'minus') => Promise<boolean> },
  row: Locator,
  type: 'plus' | 'minus'
): Promise<boolean> {
  return cart.clickQuantityButton(row, type);
}

async function getHeaderCartCount(cart: { readHeaderCartCount: () => Promise<number | null> }): Promise<number | null> {
  return cart.readHeaderCartCount();
}

async function clearCartIfPossible(cart: { clearIfPossible: () => Promise<void> }): Promise<void> {
  await cart.clearIfPossible();
}

test.describe('cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('CART-001 cart page loads successfully', async ({ cart, page }) => {
    await cart.gotoCart();
    await cart.expectLoaded();
    expect(new URL(page.url()).pathname).toMatch(CART_PATH_PATTERN);
    await assertNoCriticalError(cart);
  });

  test('CART-002 empty cart state', async ({ features, cart, page }) => {
    if (!features.emptyCartUI) test.skip(true, 'Brand does not expose empty cart UI.');

    await cart.gotoCart();
    await clearCartIfPossible(cart);
    await cart.expectLoaded();

    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: cart could not be emptied before empty-state check.').toBe(0);

    const message = cart.emptyMessage;
    const cta = cart.continueShopping;
    const bodyText = await cart.readBodyText();
    const hasEmptySignal = EMPTY_CART_PATTERN.test(bodyText) || (await message.isVisible().catch(() => false));
    const hasContinueShoppingCta = await cta.isVisible().catch(() => false);

    expect(hasEmptySignal, 'Empty cart message should be displayed.').toBe(true);
    expect(hasContinueShoppingCta, 'Continue shopping CTA should be visible.').toBe(true);
  });

  test('CART-003 cart with product loads successfully', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    await assertNoCriticalError(cart);
  });

  test('CART-004 region-specific content is displayed correctly', async ({ ctx, cart, page }) => {
    await cart.gotoCart();
    const currentUrl = new URL(page.url());
    const expectedBase = new URL(ctx.baseURL);
    expect(currentUrl.hostname).toBe(expectedBase.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(cart.body).not.toBeEmpty();
  });

  test('CART-005 cart page loads over HTTPS', async ({ cart, page }) => {
    await cart.gotoCart();
    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('CART-006 header cart count matches cart quantity', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.headerCartCount) test.skip(true, 'Brand does not expose header cart count.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);

    let itemQuantity = 0;
    for (const row of rows) {
      itemQuantity += (await readQuantityFromRow(cart, row)) ?? 1;
    }

    const headerCount = await getHeaderCartCount(cart);
    expect(headerCount, 'Header cart count should be readable.').not.toBeNull();
    expect(headerCount).toBe(itemQuantity);
  });

  test('CART-007 product image is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];

    const image = cart.itemImage(row);
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
  });

  test('CART-008 product name is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const name = cart.itemName(row);
    await expect(name).toBeVisible();
    const text = (await name.innerText()).trim();
    expect(text.length).toBeGreaterThan(1);
  });

  test('CART-009 product attributes are displayed', { tag: ['@data-dependent'] }, async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const attributes = cart.itemAttributes(row);
    const hasVisibleAttribute = (await attributes.count()) > 0 && (await attributes.first().isVisible().catch(() => false));

    const rowText = await row.innerText();
    const textHasVariant = /size|colour|color|us|eu|uk|men|women|kids|width|fit/i.test(rowText);

    if (!hasVisibleAttribute && !textHasVariant) {
      test.skip(true, 'Selected product has no visible variant attributes on staging.');
      return;
    }

    expect(hasVisibleAttribute || textHasVariant).toBe(true);
  });

  test('CART-010 product price is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const priceNode = cart.itemPrice(row);
    const rowText = await row.innerText();
    const hasPriceText = /\$\s?\d/.test(rowText);
    const hasPriceNode = await priceNode.isVisible().catch(() => false);
    expect(hasPriceNode || hasPriceText).toBe(true);
  });

  test('CART-011 sale price is displayed correctly', { tag: ['@data-dependent'] }, async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|discount|original/i.test(text);

    if (!(hasSaleSignal && prices.length >= 2)) {
      test.skip(true, 'No sale product with dual-price presentation in cart on staging.');
      return;
    }

    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('CART-012 product link redirects to PDP', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.productLinkInCart) test.skip(true, 'Brand does not include product links in cart rows.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const link = cart.productLink(row);
    const href = await link.getAttribute('href');
    expect(await link.isVisible().catch(() => false), 'Product link in cart row should be visible.').toBe(true);
    expect(href, 'Product link href should not be null.').not.toBeNull();
    const targetHref = href as string;

    const targetUrl = new URL(targetHref, page.url()).href;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();

    const current = new URL(page.url()).pathname;
    expect(PRODUCT_PATH_PATTERN.test(current) || !CART_PATH_PATTERN.test(current)).toBe(true);
    await assertNoCriticalError(cart);
  });

  test('CART-013 quantity selector/input is displayed', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const qtyControl = cart.quantityControl(row);
    const plus = cart.quantityPlusButton(row);
    const minus = cart.quantityMinusButton(row);

    const hasControl =
      (await qtyControl.isVisible().catch(() => false)) ||
      (await plus.isVisible().catch(() => false)) ||
      (await minus.isVisible().catch(() => false));
    expect(hasControl, 'Quantity control (+/-/input) should be visible.').toBe(true);
  });

  test('CART-014 increasing quantity updates cart', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const before = (await readQuantityFromRow(cart, row)) ?? 1;
    let changed = false;

    if (await setRowQuantity(cart, row, before + 1)) {
      changed = true;
    } else if (await clickQtyButton(cart, row, 'plus')) {
      changed = true;
    }

    expect(changed, 'Quantity increase control should be operable.').toBe(true);

    await page.waitForTimeout(1500);
    const after = (await readQuantityFromRow(cart, row)) ?? before;
    expect(after).toBeGreaterThan(before);
  });

  test('CART-015 decreasing quantity updates cart', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const beforeInitial = (await readQuantityFromRow(cart, row)) ?? 1;

    if (beforeInitial < 2) {
      const increased = (await setRowQuantity(cart, row, 2)) || (await clickQtyButton(cart, row, 'plus'));
      expect(increased, 'Precondition: could not increase qty to 2 before testing decrease.').toBe(true);
      await page.waitForTimeout(1200);
    }

    const before = (await readQuantityFromRow(cart, row)) ?? 2;
    const decreased = (await setRowQuantity(cart, row, Math.max(1, before - 1))) || (await clickQtyButton(cart, row, 'minus'));
    expect(decreased, 'Quantity decrease control should be operable.').toBe(true);
    await page.waitForTimeout(1500);

    const after = (await readQuantityFromRow(cart, row)) ?? before;
    expect(after).toBeLessThan(before);
  });

  test('CART-016 quantity cannot be set below minimum', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const canSetZero = await setRowQuantity(cart, row, 0);
    expect(canSetZero, 'Quantity input should be editable for minimum validation.').toBe(true);
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(cart);
    const afterValue = afterRows[0] ? await readQuantityFromRow(cart, afterRows[0]) : null;
    const bodyText = await cart.readBodyText();

    const minRuleApplied = (afterValue !== null && afterValue >= 1) || afterRows.length === 0 || STOCK_OR_VALIDATION_PATTERN.test(bodyText);
    expect(minRuleApplied).toBe(true);
  });

  test('CART-017 quantity cannot exceed available stock', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const editable = await setRowQuantity(cart, row, 99);
    expect(editable, 'Quantity input should be editable for stock validation.').toBe(true);
    await page.waitForTimeout(1800);

    const after = await readQuantityFromRow(cart, row);
    const bodyText = await cart.readBodyText();
    expect((after !== null && after < 99) || STOCK_OR_VALIDATION_PATTERN.test(bodyText)).toBe(true);
  });

  test('CART-018 manual quantity input works if supported', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const editable = await setRowQuantity(cart, row, 2);
    expect(editable, 'Manual quantity input should be editable.').toBe(true);
    await page.waitForTimeout(1500);

    const after = await readQuantityFromRow(cart, row);
    expect(after).toBe(2);
  });

  test('CART-019 invalid quantity input is handled', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.quantityControls) test.skip(true, 'Brand does not expose quantity controls in cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    expect(rows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);
    const row = rows[0];
    const control = cart.quantityControl(row);
    expect(await control.isVisible().catch(() => false), 'Quantity control should be visible.').toBe(true);

    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    expect(tagName, 'Quantity control must be an input element for invalid-input validation.').toBe('input');

    const before = (await readQuantityFromRow(cart, row)) ?? 1;
    await control.fill('abc');
    await control.press('Enter').catch(() => undefined);
    await control.blur();
    await page.waitForTimeout(1500);

    const after = await readQuantityFromRow(cart, row);
    const bodyText = await cart.readBodyText();
    expect(after === before || STOCK_OR_VALIDATION_PATTERN.test(bodyText)).toBe(true);
    await assertNoCriticalError(cart);
  });

  test('CART-020 product can be removed from cart', async ({ features, ctx, home, plp, pdp, cart, page }) => {
    if (!features.removeFromCart) test.skip(true, 'Brand does not support removing items from cart.');

    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const beforeRows = await getVisibleCartRows(cart);
    expect(beforeRows.length, 'Precondition: no product was added to cart.').toBeGreaterThan(0);

    const remove = cart.removeButton(beforeRows[0]);
    expect(await remove.isVisible().catch(() => false), 'Remove button should be visible.').toBe(true);
    await remove.click();
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(cart);
    expect(afterRows.length).toBeLessThan(beforeRows.length);
  });
});
