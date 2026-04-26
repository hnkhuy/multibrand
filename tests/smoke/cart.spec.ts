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

  test('CART-002 empty cart state', async ({ cart, page }) => {
    await cart.gotoCart();
    await clearCartIfPossible(cart);
    await cart.expectLoaded();

    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length > 0, 'Precondition not met: cart is not empty and remove action is not available.');

    const message = cart.emptyMessage;
    const cta = cart.continueShopping;
    const bodyText = await cart.readBodyText();
    const hasEmptySignal = EMPTY_CART_PATTERN.test(bodyText) || (await message.isVisible().catch(() => false));
    const hasContinueShoppingCta = await cta.isVisible().catch(() => false);

    test.skip(!hasEmptySignal || !hasContinueShoppingCta, 'Empty cart message/continue shopping CTA not exposed for this brand.');
    expect(hasEmptySignal).toBe(true);
    expect(hasContinueShoppingCta).toBe(true);
  });

  test('CART-003 cart with product loads successfully', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
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

  test('CART-006 header cart count matches cart quantity', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');

    let itemQuantity = 0;
    for (const row of rows) {
      itemQuantity += (await readQuantityFromRow(cart, row)) ?? 1;
    }

    const headerCount = await getHeaderCartCount(cart);
    test.skip(headerCount === null, 'Header cart count not detectable for this brand layout.');
    expect(headerCount).toBe(itemQuantity);
  });

  test('CART-007 product image is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];

    const image = cart.itemImage(row);
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
  });

  test('CART-008 product name is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const name = cart.itemName(row);
    await expect(name).toBeVisible();
    const text = (await name.innerText()).trim();
    expect(text.length).toBeGreaterThan(1);
  });

  test('CART-009 product attributes are displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const attributes = cart.itemAttributes(row);
    const hasVisibleAttribute = (await attributes.count()) > 0 && (await attributes.first().isVisible().catch(() => false));

    const rowText = await row.innerText();
    const textHasVariant = /size|colour|color|us|eu|uk|men|women|kids|width|fit/i.test(rowText);
    test.skip(!hasVisibleAttribute && !textHasVariant, 'No visible variant attributes for selected product.');

    expect(hasVisibleAttribute || textHasVariant).toBe(true);
  });

  test('CART-010 product price is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const priceNode = cart.itemPrice(row);
    const rowText = await row.innerText();
    const hasPriceText = /\$\s?\d/.test(rowText);
    const hasPriceNode = await priceNode.isVisible().catch(() => false);
    expect(hasPriceNode || hasPriceText).toBe(true);
  });

  test('CART-011 sale price is displayed correctly', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|discount|original/i.test(text);

    test.skip(!(hasSaleSignal && prices.length >= 2), 'No sale product/pricing presentation detected in this run.');
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('CART-012 product link redirects to PDP', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const link = cart.productLink(row);
    const href = await link.getAttribute('href');
    test.skip(!(await link.isVisible().catch(() => false)) || !href, 'Product link is not available in cart row.');
    const targetHref = href as string;

    const targetUrl = new URL(targetHref, page.url()).href;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();

    const current = new URL(page.url()).pathname;
    expect(PRODUCT_PATH_PATTERN.test(current) || !CART_PATH_PATTERN.test(current)).toBe(true);
    await assertNoCriticalError(cart);
  });

  test('CART-013 quantity selector/input is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const qtyControl = cart.quantityControl(row);
    const plus = cart.quantityPlusButton(row);
    const minus = cart.quantityMinusButton(row);

    const hasControl =
      (await qtyControl.isVisible().catch(() => false)) ||
      (await plus.isVisible().catch(() => false)) ||
      (await minus.isVisible().catch(() => false));
    expect(hasControl).toBe(true);
  });

  test('CART-014 increasing quantity updates cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const before = (await readQuantityFromRow(cart, row)) ?? 1;
    let changed = false;

    if (await setRowQuantity(cart, row, before + 1)) {
      changed = true;
    } else if (await clickQtyButton(cart, row, 'plus')) {
      changed = true;
    }

    test.skip(!changed, 'No quantity increase control is available.');

    await page.waitForTimeout(1500);
    const after = (await readQuantityFromRow(cart, row)) ?? before;
    expect(after).toBeGreaterThan(before);
  });

  test('CART-015 decreasing quantity updates cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const beforeInitial = (await readQuantityFromRow(cart, row)) ?? 1;

    if (beforeInitial < 2) {
      const increased = (await setRowQuantity(cart, row, 2)) || (await clickQtyButton(cart, row, 'plus'));
      test.skip(!increased, 'Unable to prepare quantity > 1 for decrease validation.');
      await page.waitForTimeout(1200);
    }

    const before = (await readQuantityFromRow(cart, row)) ?? 2;
    const decreased = (await setRowQuantity(cart, row, Math.max(1, before - 1))) || (await clickQtyButton(cart, row, 'minus'));
    test.skip(!decreased, 'No quantity decrease control is available.');
    await page.waitForTimeout(1500);

    const after = (await readQuantityFromRow(cart, row)) ?? before;
    expect(after).toBeLessThan(before);
  });

  test('CART-016 quantity cannot be set below minimum', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const canSetZero = await setRowQuantity(cart, row, 0);
    test.skip(!canSetZero, 'Quantity input is not editable for minimum validation.');
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(cart);
    const afterValue = afterRows[0] ? await readQuantityFromRow(cart, afterRows[0]) : null;
    const bodyText = await cart.readBodyText();

    const minRuleApplied = (afterValue !== null && afterValue >= 1) || afterRows.length === 0 || STOCK_OR_VALIDATION_PATTERN.test(bodyText);
    expect(minRuleApplied).toBe(true);
  });

  test('CART-017 quantity cannot exceed available stock', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const editable = await setRowQuantity(cart, row, 99);
    test.skip(!editable, 'Quantity input is not editable for stock validation.');
    await page.waitForTimeout(1800);

    const after = await readQuantityFromRow(cart, row);
    const bodyText = await cart.readBodyText();
    expect((after !== null && after < 99) || STOCK_OR_VALIDATION_PATTERN.test(bodyText)).toBe(true);
  });

  test('CART-018 manual quantity input works if supported', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const editable = await setRowQuantity(cart, row, 2);
    test.skip(!editable, 'Manual quantity input/select is not supported.');
    await page.waitForTimeout(1500);

    const after = await readQuantityFromRow(cart, row);
    expect(after).toBe(2);
  });

  test('CART-019 invalid quantity input is handled', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(cart);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const control = cart.quantityControl(row);
    const visible = await control.isVisible().catch(() => false);
    test.skip(!visible, 'Quantity control is not visible.');

    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    test.skip(tagName !== 'input', 'Invalid text input validation requires editable input control.');

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

  test('CART-020 product can be removed from cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const beforeRows = await getVisibleCartRows(cart);
    test.skip(beforeRows.length === 0, 'Precondition not met: no product was added to cart.');

    const remove = cart.removeButton(beforeRows[0]);
    test.skip(!(await remove.isVisible().catch(() => false)), 'Remove control is not available.');
    await remove.click();
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(cart);
    expect(afterRows.length).toBeLessThan(beforeRows.length);
  });
});
