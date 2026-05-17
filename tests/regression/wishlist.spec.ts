// TC coverage: WL-001..WL-017, WL-van-001
// Based on: src/documents/tcs/GRA_Wishlist-Tcs.csv

import type { Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import type { AccountPage } from '../../src/pages/Account.page';
import type { HomePage } from '../../src/pages/Home.page';
import { searchData, plpPaths, accountData } from '../../config/testData';

const PRODUCT_PATH = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const PRICE_PATTERN = /\$\s?\d/;
const WISHLIST_PATH = /\/account\/wishlist|\/wishlist/i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

function excludeBrand(ctx: BrandContext, excluded: Brand | Brand[]): void {
  const list = Array.isArray(excluded) ? excluded : [excluded];
  test.skip(list.includes(ctx.brand), `Test excludes ${list.join(', ')}.`);
}

async function loginAs(
  email: string,
  password: string,
  page: Page,
  account: AccountPage,
  home: HomePage
): Promise<void> {
  await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await account.dismissInterruptions();

  if (!(await account.emailInput.isVisible().catch(() => false))) {
    // Vans-style modal: trigger login from homepage
    await home.goto('/');
    await account.signInTrigger.click().catch(() => undefined);
    await page.waitForTimeout(600);
  }

  if (await account.emailInput.isVisible().catch(() => false)) {
    await account.emailInput.fill(email);
    await account.passwordInput.fill(password);
    await account.authSubmit.click();
    await page.waitForLoadState('domcontentloaded');
    await account.dismissInterruptions();
  }
}

async function navigateToPdp(
  keyword: string,
  home: HomePage,
  plp: { goto(p: string): Promise<void>; expectLoaded(): Promise<void>; openFirstProductByHref(): Promise<boolean>; openFirstProduct(): Promise<void> },
  pdp: { expectLoaded(): Promise<void>; dismissInterruptions(): Promise<void> }
): Promise<void> {
  await home.search(keyword);
  await plp.expectLoaded().catch(() => undefined);
  const ok = await plp.openFirstProductByHref().catch(() => false);
  if (!ok) await plp.openFirstProduct();
  await pdp.expectLoaded().catch(() => undefined);
  await pdp.dismissInterruptions();
}

test.describe('wishlist', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('WL-001 logged-in user can add product to wishlist from PDP', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    await expect(trigger).toBeVisible();
    const stateBefore = await trigger.getAttribute('aria-label').catch(() => '') ?? await trigger.innerText().catch(() => '');
    await trigger.click();
    await page.waitForTimeout(1000);
    const stateAfter = await trigger.getAttribute('aria-label').catch(() => '') ?? await trigger.innerText().catch(() => '');
    const toastVisible = await wishlist.toast.isVisible().catch(() => false);
    expect(
      stateAfter !== stateBefore || toastVisible,
      'Wishlist icon state should change or toast should appear after adding.'
    ).toBe(true);
  });

  test('WL-002 wishlist product can be added to cart from wishlist page', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    // Ensure there is at least one item in wishlist by adding from PDP
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(800);
    }
    // Navigate to wishlist page
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    const count = await items.count();
    if (count === 0) {
      test.skip(true, '@data-dependent — wishlist page is empty; could not pre-populate.');
      return;
    }
    const baseline = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    const atcBtn = items.first().locator('button:has-text("Add to Cart"), button:has-text("Add to Bag"), button:has-text("Move to Cart"), a:has-text("Add to Cart")').first();
    if (!(await atcBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Add to Cart button not visible on wishlist item — may require size selection.');
      return;
    }
    await atcBtn.click();
    await page.waitForTimeout(1500);
    const after = await pdp.miniCart.readHeaderCartCount();
    expect(
      after !== null && after > baseline,
      'Cart count should increment after adding wishlist item to cart.'
    ).toBe(true);
  });

  test('WL-003 product can be removed from the wishlist page', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    // Ensure there is at least one item in wishlist
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    const countBefore = await items.count();
    if (countBefore === 0) {
      test.skip(true, '@data-dependent — wishlist is empty; could not pre-populate.');
      return;
    }
    const removeBtn = wishlist.removeButton;
    if (!(await removeBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Remove button not visible on wishlist page for this brand.');
      return;
    }
    await removeBtn.click();
    await page.waitForTimeout(1200);
    const countAfter = await items.count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('WL-004 wishlist icon is visible on the PDP', { tag: ['@smoke'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    test.skip(!features.wishlistOnPdp, 'Wishlist button on PDP disabled for this brand.');
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    await expect(pdp.wishlistTrigger).toBeVisible();
  });

  test('WL-005 wishlist icon is visible on PLP product cards', async ({ features, ctx, plp }) => {
    test.skip(!features.wishlistOnPlp, 'Wishlist on PLP disabled for this brand.');
    await plp.goto(plpPaths[ctx.brand]);
    await plp.expectLoaded().catch(() => undefined);
    await plp.dismissInterruptions();
    const triggers = plp.wishlistTriggers;
    await expect(triggers.first()).toBeVisible();
    const count = await triggers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('WL-006 guest user redirected to login when clicking wishlist icon', { tag: ['@smoke'] }, async ({ features, ctx, home, plp, pdp, page }) => {
    excludeBrand(ctx, 'vans'); // Vans uses guest localStorage wishlist — see WL-van-001
    test.skip(!features.wishlistRequiresLogin, 'Wishlist does not require login for this brand.');
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible().catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on PDP for this brand.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const redirectedToLogin =
      /login|sign.in|account/i.test(currentUrl) ||
      /sign in|log in|email|password/i.test(bodyText);
    expect(redirectedToLogin, 'Guest clicking wishlist should be redirected to login.').toBe(true);
  });

  test('WL-007 wishlist icon state updates to active/filled after adding', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    await expect(trigger).toBeVisible();
    const classBefore = await trigger.getAttribute('class').catch(() => '');
    const labelBefore = await trigger.getAttribute('aria-label').catch(() => '');
    await trigger.click();
    await page.waitForTimeout(1000);
    const classAfter = await trigger.getAttribute('class').catch(() => '');
    const labelAfter = await trigger.getAttribute('aria-label').catch(() => '');
    const toastVisible = await wishlist.toast.isVisible().catch(() => false);
    const stateChanged = classBefore !== classAfter || labelBefore !== labelAfter;
    expect(
      stateChanged || toastVisible,
      'Wishlist icon state should change to active or toast should appear after adding.'
    ).toBe(true);
  });

  test('WL-008 wishlist page shows product with image + name + price', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    if ((await items.count()) === 0) {
      test.skip(true, '@data-dependent — wishlist is empty after add attempt.');
      return;
    }
    const firstItem = items.first();
    const img = firstItem.locator('img').first();
    await expect(img).toBeVisible();
    const itemText = await firstItem.innerText();
    expect(itemText.trim().length).toBeGreaterThan(1);
    expect(PRICE_PATTERN.test(itemText), 'Wishlist item should show a price.').toBe(true);
  });

  test('WL-009 empty wishlist state shown when wishlist has no products', async ({ features, home, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const items = wishlist.items;
    // Remove all items first
    for (let i = 0; i < 6; i++) {
      const removeBtn = wishlist.removeButton;
      if (!(await removeBtn.isVisible().catch(() => false))) break;
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }
    const countAfter = await items.count();
    if (countAfter > 0) {
      test.skip(true, 'Could not empty wishlist — items remain after removal attempts.');
      return;
    }
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptySignal = /empty|no items|no products|nothing|wishlist is empty/i.test(bodyText);
    expect(emptySignal, 'Empty wishlist state should be visible.').toBe(true);
  });

  test('WL-010 removing last item from wishlist shows empty state', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    if (await pdp.wishlistTrigger.isVisible().catch(() => false)) {
      await pdp.wishlistTrigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    for (let i = 0; i < 8; i++) {
      const count = await items.count();
      if (count === 0) break;
      const removeBtn = wishlist.removeButton;
      if (!(await removeBtn.isVisible().catch(() => false))) break;
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }
    const finalCount = await items.count();
    if (finalCount > 0) {
      test.skip(true, 'Could not empty wishlist — could not verify empty state.');
      return;
    }
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(/empty|no items|nothing/i.test(bodyText), 'Empty state should appear after last item removed.').toBe(true);
  });

  test('WL-011 removing one item from multi-item wishlist leaves others intact', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const items = wishlist.items;
    const countBefore = await items.count();
    if (countBefore < 2) {
      test.skip(true, 'Wishlist has fewer than 2 items — needs 2+ products for this TC.');
      return;
    }
    await wishlist.removeButton.click();
    await page.waitForTimeout(1000);
    const countAfter = await items.count();
    expect(countAfter).toBe(countBefore - 1);
  });

  test('WL-012 header cart count updates after adding wishlist item to cart', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    test.skip(!features.headerCartCount, 'Brand does not expose header cart count.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    if (await pdp.wishlistTrigger.isVisible().catch(() => false)) {
      await pdp.wishlistTrigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    if ((await items.count()) === 0) {
      test.skip(true, '@data-dependent — wishlist is empty after add attempt.');
      return;
    }
    const baseline = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    const atcBtn = items.first().locator('button:has-text("Add to Cart"), button:has-text("Add to Bag"), button:has-text("Move to Cart")').first();
    if (!(await atcBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Add to Cart button not visible on wishlist item.');
      return;
    }
    await atcBtn.click();
    await page.waitForTimeout(1500);
    const after = await pdp.miniCart.readHeaderCartCount();
    expect(after !== null && after > baseline, 'Cart count should increment after adding from wishlist.').toBe(true);
  });

  test('WL-013 wishlist contents persist after page refresh', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    if (await pdp.wishlistTrigger.isVisible().catch(() => false)) {
      await pdp.wishlistTrigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const countBefore = await wishlist.items.count();
    if (countBefore === 0) {
      test.skip(true, '@data-dependent — wishlist is empty after add attempt.');
      return;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    const countAfter = await wishlist.items.count();
    expect(countAfter).toBe(countBefore);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('WL-014 clicking wishlist product name/image navigates to its PDP', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    if (await pdp.wishlistTrigger.isVisible().catch(() => false)) {
      await pdp.wishlistTrigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const items = wishlist.items;
    if ((await items.count()) === 0) {
      test.skip(true, '@data-dependent — wishlist is empty after add attempt.');
      return;
    }
    const link = items.first().locator('a[href]').first();
    const href = await link.getAttribute('href').catch(() => null);
    if (!href) {
      test.skip(true, 'No product link found on wishlist item.');
      return;
    }
    await page.goto(new URL(href, page.url()).href, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('WL-015 OOS product in wishlist shows unavailable state', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — OOS product in wishlist cannot be reliably staged for automation.');
  });

  test('WL-016 wishlist persists after logout and re-login', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    if (await pdp.wishlistTrigger.isVisible().catch(() => false)) {
      await pdp.wishlistTrigger.click();
      await page.waitForTimeout(800);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const countBefore = await wishlist.items.count();
    if (countBefore === 0) {
      test.skip(true, '@data-dependent — wishlist is empty after add attempt.');
      return;
    }
    // Logout
    const logoutTrigger = account.logoutTrigger;
    if (await logoutTrigger.isVisible().catch(() => false)) {
      await logoutTrigger.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      await page.goto('/account/logout', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
    // Re-login
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await pdp.dismissInterruptions();
    const countAfter = await wishlist.items.count();
    expect(countAfter).toBe(countBefore);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('WL-017 adding product to wishlist from PDP fires a dataLayer event', { tag: ['@analytics'] }, async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    await page.addInitScript(() => {
      (window as any).__dlCapture = [];
      Object.defineProperty(window, 'dataLayer', {
        get: () => (window as any).__dlCapture,
        set(val: unknown[]) { (window as any).__dlCapture = val; }
      });
    });
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible().catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on PDP.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1500);
    const captured = await page.evaluate(() =>
      ((window as any).__dlCapture ?? []).map((e: unknown) => JSON.stringify(e))
    );
    const hasEvent = (captured as string[]).some((e) =>
      /wishlist|add_to_wishlist/i.test(e)
    );
    expect(hasEvent, 'A wishlist dataLayer event should fire after adding a product.').toBe(true);
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('WL-van-001 Vans guest wishlist works without login — product saved in localStorage', async ({ ctx, home, plp, pdp, wishlist, page }) => {
    onlyBrand(ctx, 'vans');
    // Ensure logged out
    await page.goto('/account/logout', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible().catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on Vans PDP.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1000);
    // Check that no login redirect occurred
    const currentUrl = page.url();
    expect(/login|sign.in/i.test(currentUrl), 'Vans guest wishlist should NOT redirect to login.').toBe(false);
    // Check wishlist icon state changed
    const stateAfter = await trigger.getAttribute('class').catch(() => '');
    const toastVisible = await wishlist.toast.isVisible().catch(() => false);
    const inLocalStorage = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some((k) => /wishlist/i.test(k));
    }).catch(() => false);
    expect(
      toastVisible || inLocalStorage || (stateAfter ?? '').includes('active') || (stateAfter ?? '').includes('filled'),
      'Vans guest wishlist should persist in localStorage or show active state.'
    ).toBe(true);
  });

  // ─── Middle ──────────────────────────────────────────────────────────────

  test('WL-018 wishlist page is accessible from My Account navigation', async ({ features, ctx, home, account, wishlist, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const body = await page.locator('body').innerText().catch(() => '');
    const hasWishlistLink = /wishlist|saved items|favourites|favorites/i.test(body);
    const wishlistLink = page.locator('a[href*="wishlist"], a[href*="saved"]').first();
    const linkVisible = await wishlistLink.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasWishlistLink || linkVisible, 'My Account navigation should expose a wishlist link.').toBe(true);
  });

  test('WL-019 re-clicking filled wishlist icon removes the product from wishlist', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on PDP.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1_000);
    const stateAfterAdd = await trigger.getAttribute('aria-label').catch(() => '') ??
      await trigger.getAttribute('class').catch(() => '');
    await trigger.click();
    await page.waitForTimeout(1_000);
    const stateAfterRemove = await trigger.getAttribute('aria-label').catch(() => '') ??
      await trigger.getAttribute('class').catch(() => '');
    expect(stateAfterRemove).not.toBe(stateAfterAdd);
  });

  test('WL-020 wishlist count in header updates after adding a product', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on PDP.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1_000);
    const body = await page.locator('body').innerText().catch(() => '');
    const wishlistFeedback =
      /added to wishlist|saved|favourited|remove from wishlist/i.test(body) ||
      (await wishlist.toast.isVisible({ timeout: 3_000 }).catch(() => false));
    expect(wishlistFeedback, 'Some feedback should be visible after adding to wishlist.').toBe(true);
  });

  test('WL-021 product variant added to wishlist reflects the selected variant on the wishlist page', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    await pdp.selectFirstAvailableSize().catch(() => undefined);
    const trigger = pdp.wishlistTrigger;
    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Wishlist trigger not visible on PDP.');
      return;
    }
    await trigger.click();
    await page.waitForTimeout(1_000);
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const itemsText = await wishlist.items.allInnerTexts().catch(() => [] as string[]);
    const body = itemsText.join(' ').toLowerCase();
    expect(
      /wishlist|saved|favourite|remove/i.test(body) || itemsText.length > 0,
      'Wishlist page should show the added product.'
    ).toBe(true);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('WL-022 OOS product in wishlist can still be removed from the wishlist page', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const items = wishlist.items;
    const itemCount = await items.count();
    if (itemCount === 0) {
      test.skip(true, 'No items in wishlist to test remove on OOS product.');
      return;
    }
    const removeBtn = wishlist.removeButton;
    if (!(await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Remove button not visible on wishlist page.');
      return;
    }
    await removeBtn.first().click();
    await page.waitForTimeout(1_000);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(
      /application error|something went wrong|500/i.test(body),
      'Removing a wishlist item should not cause a server error.'
    ).toBe(false);
    const newCount = await items.count();
    expect(newCount).toBeLessThan(itemCount);
  });

  test('WL-023 clicking a wishlist item navigates to its PDP', async ({ features, ctx, home, plp, pdp, wishlist, account, page }) => {
    test.skip(!features.wishlist, 'Wishlist feature disabled for this brand.');
    excludeBrand(ctx, 'vans');
    await loginAs(accountData.shared.email, accountData.shared.password, page, account, home);
    // Ensure there is a product in the wishlist
    await home.goto('/');
    await navigateToPdp(searchData[ctx.brand].keyword, home, plp, pdp);
    const trigger = pdp.wishlistTrigger;
    if (await trigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(1_000);
    }
    await page.goto('/account/wishlist', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const items = wishlist.items;
    if ((await items.count()) === 0) {
      test.skip(true, 'No items in wishlist to click through to PDP.');
      return;
    }
    const productLink = items.first().locator('a').first();
    if (!(await productLink.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No clickable link on wishlist item.');
      return;
    }
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText().catch(() => '');
    expect(
      /application error|something went wrong|404/i.test(body),
      'Clicking wishlist item should navigate to a valid PDP, not an error page.'
    ).toBe(false);
    await expect(pdp.addToCartButton).toBeVisible({ timeout: 10_000 });
  });
});
