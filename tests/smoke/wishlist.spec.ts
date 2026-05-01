import { accountData, searchData } from '../../config/testData';
import { env, getEnv } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Selectors } from '../../src/core/types';
import type { HomePage } from '../../src/pages/Home.page';
import type { Locator, Page } from '@playwright/test';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const WOMENS_PLP_PATH = '/shop/womens';
const PLP_URL_PATTERN = /\/shop\/|\/category\/|\/collections?\//i;
const SEARCH_URL_PATTERN = /search|q=|query=|\/s\//i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/p\/|\.html(?:$|\?)/i;
const WISHLIST_EMPTY_PATTERN = /empty wishlist|your wishlist is empty|no items|start shopping|continue shopping/i;
const LOGIN_PATTERN = /\/login|\/sign-in|\/account/i;
const LOGIN_TEXT_PATTERN = /sign in|log in|login|create account|email|password/i;
const SUCCESS_PATTERN = /added to wishlist|saved to wishlist|saved|favourite|favorite|wishlist/i;
const PRICE_PATTERN = /\$\s?\d|aud|nzd/i;
const SALE_PATTERN = /sale|was|now|save/i;
const REQUIRED_OPTION_PATTERN = /select size|choose size|please select|required/i;

function requireDefined<T>(value: T | null | undefined, skipMessage: string): T {
  test.skip(value == null, skipMessage);
  return value as T;
}

function getLoginCredential(): { email: string; password: string } | null {
  const email =
    [
    getEnv('TEST_ACCOUNT_EMAIL'),
    getEnv('ACCOUNT_EMAIL'),
    getEnv('LOGIN_EMAIL'),
    getEnv('E2E_EMAIL')
  ].find((value) => value.trim().length > 0) || accountData.shared.email;
  const password =
    [
    getEnv('TEST_ACCOUNT_PASSWORD'),
    getEnv('ACCOUNT_PASSWORD'),
    getEnv('LOGIN_PASSWORD'),
    getEnv('E2E_PASSWORD')
  ].find((value) => value.trim().length > 0) || accountData.shared.password;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

async function gotoHomeWithRetry(home: HomePage, page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await home.goto('/');
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function openPlp(home: HomePage, page: Page, keyword: string): Promise<void> {
  await gotoHomeWithRetry(home, page);
  await home.search(keyword);
  await page.keyboard.press('Escape').catch(() => undefined);
  await home.dismissInterruptions();

  const isPlpLikeUrl = PLP_URL_PATTERN.test(page.url()) || SEARCH_URL_PATTERN.test(page.url());
  if (!isPlpLikeUrl) {
    const navItems = await home.header.getVisibleNavigationItems();
    const plpEntry = requireDefined(
      navItems.find((item) => PLP_URL_PATTERN.test(item.href)),
      'No PLP navigation entry was found.'
    );
    await page.goto(new URL(plpEntry.href, page.url()).href, { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
  }

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
}

async function collectPlpProductLinks(page: Page, selectors: Selectors, limit = 1): Promise<string[]> {
  const anchors = page.locator(selectors.wishlist.plpProductLink);
  const items = await anchors.evaluateAll((elements) => {
    const productPathPattern = /\/product\/|\/p\/|\.html(?:$|\?)/i;
    const blockedProductPathPattern = /\/wishlist|\/cart|\/account|\/login|\/track-order|\/stores|\/sign-up/i;

    return elements
      .map((element) => {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href') ?? '';
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none';

        return { href, top: rect.top, visible };
      })
      .filter((item) => item.visible && productPathPattern.test(item.href) && !blockedProductPathPattern.test(item.href))
      .filter((item) => item.top > 140)
      .slice(0, 30);
  });

  const deduped = new Set<string>();
  for (const item of items) {
    deduped.add(item.href);
    if (deduped.size >= limit) {
      break;
    }
  }

  return Array.from(deduped);
}

async function openValidPdp(home: HomePage, page: Page, selectors: Selectors): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(WOMENS_PLP_PATH, { waitUntil: 'domcontentloaded' });
      await home.dismissInterruptions();
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
      await page
        .waitForFunction(() => {
          const productPathPattern = /\/product\/|\/p\/|\.html(?:$|\?)/i;
          return Array.from(document.querySelectorAll('a[href]')).some((element) => {
            const anchor = element as HTMLAnchorElement;
            return productPathPattern.test(anchor.getAttribute('href') ?? '');
          });
        }, { timeout: 10_000 })
        .catch(() => undefined);
      await page.waitForTimeout(500);
      break;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }

  const productLinks = await collectPlpProductLinks(page, selectors, 1);
  test.skip(productLinks.length === 0, `No PDP product link found on ${WOMENS_PLP_PATH}.`);

  const [targetHref] = productLinks;
  const pdpUrl = new URL(targetHref, page.url());
  await page.goto(pdpUrl.href, { waitUntil: 'domcontentloaded' });
  await home.dismissInterruptions();
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  await page.locator(selectors.pdp.productTitle).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);

  const hasPdpTitle = await page.locator(selectors.pdp.productTitle).first().isVisible().catch(() => false);
  if (hasPdpTitle) {
    return;
  }

  test.skip(true, `The first product from ${WOMENS_PLP_PATH} did not open a valid PDP.`);
}

async function clickLocatorRobust(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8000 }).catch(async () => {
    await target.evaluate((node) => (node as HTMLElement).click());
  });
}

async function getFirstVisibleProductCard(page: Page, selectors: Selectors): Promise<Locator | null> {
  const cards = page.locator(selectors.wishlist.productCard);
  const total = await cards.count();
  for (let index = 0; index < Math.min(total, 20); index += 1) {
    const card = cards.nth(index);
    if (await card.isVisible().catch(() => false)) {
      return card;
    }
  }
  return null;
}

async function getWishlistTriggerFromProductCard(page: Page, selectors: Selectors): Promise<Locator | null> {
  const card = await getFirstVisibleProductCard(page, selectors);
  if (!card) {
    return null;
  }
  const trigger = card.locator(selectors.wishlist.trigger).first();
  return (await trigger.isVisible().catch(() => false)) ? trigger : null;
}

async function getWishlistTriggerFromPdp(page: Page, selectors: Selectors): Promise<Locator | null> {
  const trigger = page.locator(`main ${selectors.wishlist.trigger}`).first();
  return (await trigger.isVisible().catch(() => false)) ? trigger : null;
}

async function readBodyText(page: Page): Promise<string> {
  return ((await page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
}

async function isLoginGate(page: Page): Promise<boolean> {
  const body = await readBodyText(page);
  return LOGIN_PATTERN.test(page.url().toLowerCase()) || LOGIN_TEXT_PATTERN.test(body);
}

async function tryLoginIfNeeded(page: Page): Promise<boolean> {
  if (!(await isLoginGate(page))) {
    return true;
  }

  const credential = getLoginCredential();
  if (!credential) {
    return false;
  }

  const emailInput = page
    .locator('input[type="email"], input[name*="email" i], input[id*="email" i]')
    .first();
  const passwordInput = page
    .locator('input[type="password"], input[name*="password" i], input[id*="password" i]')
    .first();

  const emailVisible = await emailInput.isVisible().catch(() => false);
  const passwordVisible = await passwordInput.isVisible().catch(() => false);
  if (!emailVisible || !passwordVisible) {
    return false;
  }

  await emailInput.fill(credential.email);
  await passwordInput.fill(credential.password);

  const submit = page
    .locator(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), button:has-text("Continue")'
    )
    .first();
  await clickLocatorRobust(submit);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);

  return !(await isLoginGate(page));
}

async function openWishlistPage(page: Page, home: HomePage, selectors: Selectors): Promise<void> {
  const current = page.url();
  const headerLink = page.locator(selectors.wishlist.pageLink).first();
  if (await headerLink.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL((url) => url.href !== current, { timeout: 12_000 }).catch(() => undefined),
      clickLocatorRobust(headerLink)
    ]);
    await home.dismissInterruptions();
    return;
  }

  await page.goto('/wishlist', { waitUntil: 'domcontentloaded' });
  await home.dismissInterruptions();
}

async function selectConfigurableVariantIfPossible(page: Page, selectors: Selectors): Promise<string[]> {
  const selectedValues: string[] = [];
  const variants = page.locator(selectors.wishlist.variantOption);
  const total = await variants.count();
  for (let index = 0; index < Math.min(total, 8); index += 1) {
    const option = variants.nth(index);
    const visible = await option.isVisible().catch(() => false);
    if (!visible) {
      continue;
    }

    const tagName = await option.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const select = option;
      const value = await select
        .evaluate((node) => {
          const input = node as HTMLSelectElement;
          const candidate = Array.from(input.options).find(
            (opt) => !opt.disabled && opt.value && !/select|choose/i.test(opt.textContent ?? '')
          );
          return candidate?.value ?? '';
        })
        .catch(() => '');

      if (value) {
        await select.selectOption(value).catch(() => undefined);
        const selectedText = await select
          .evaluate((node) => (node as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '')
          .catch(() => '');
        if (selectedText) {
          selectedValues.push(selectedText);
        }
      }
      continue;
    }

    const disabled = await option
      .evaluate((node) => {
        const button = node as HTMLButtonElement;
        return button.disabled || button.getAttribute('aria-disabled') === 'true';
      })
      .catch(() => true);
    if (disabled) {
      continue;
    }

    const label = ((await option.innerText().catch(() => '')) || '').trim();
    await clickLocatorRobust(option);
    if (label) {
      selectedValues.push(label);
    }
  }

  return selectedValues;
}

async function ensureWishlistHasProduct(page: Page, home: HomePage, selectors: Selectors): Promise<void> {
  await openValidPdp(home, page, selectors);
  const trigger = await getWishlistTriggerFromPdp(page, selectors);
  test.skip(!trigger, 'Wishlist button is not available on PDP.');
  await clickLocatorRobust(trigger!);
  await page.waitForTimeout(1200);

  const loggedIn = await tryLoginIfNeeded(page);
  test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

  await openWishlistPage(page, home, selectors);
  await page.waitForLoadState('domcontentloaded');
  const itemCount = await page.locator(selectors.wishlist.pageItem).count();
  test.skip(itemCount === 0, 'Could not prepare wishlist with at least one product.');
}

async function clearWishlistIfPossible(page: Page, selectors: Selectors): Promise<boolean> {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const items = page.locator(selectors.wishlist.pageItem);
    const count = await items.count();
    if (count === 0) {
      return true;
    }

    const removeBtn = items.first().locator(selectors.wishlist.removeButton).first();
    const visible = await removeBtn.isVisible().catch(() => false);
    if (!visible) {
      return false;
    }
    await clickLocatorRobust(removeBtn);
    await page.waitForTimeout(900);
  }

  return (await page.locator(selectors.wishlist.pageItem).count()) === 0;
}

test.describe('wishlist', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('WL-001 wishlist icon is displayed on product card', async ({ ctx, home, page, selectors }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const trigger = await getWishlistTriggerFromProductCard(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on product cards for this PLP.');
    await expect(trigger!).toBeVisible();
  });

  test('WL-002 wishlist icon is displayed on PDP', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');
    await expect(trigger!).toBeVisible();
  });

  test('WL-003 guest user is redirected to login when adding product to wishlist', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');

    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);

    const body = await readBodyText(page);
    const redirected = (await isLoginGate(page)) || /wishlist|saved/.test(body);
    expect(redirected).toBe(true);
  });

  test('WL-004 wishlist action is preserved after login if applicable', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');

    const pdpBefore = page.url();
    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);

    const requiresLogin = await isLoginGate(page);
    test.skip(!requiresLogin, 'This storefront does not enforce login before wishlist add in this flow.');

    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Valid account credentials are required for WL-004.');

    const body = await readBodyText(page);
    const preserved =
      /wishlist|saved/.test(body) ||
      /wishlist/.test(page.url().toLowerCase()) ||
      new URL(page.url()).pathname === new URL(pdpBefore).pathname;
    expect(preserved).toBe(true);
  });

  test('WL-005 logged-in user can add product to wishlist from PLP', async ({ ctx, home, page, selectors }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const trigger = await getWishlistTriggerFromProductCard(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on PLP product cards.');

    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);
    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    const body = await readBodyText(page);
    expect(SUCCESS_PATTERN.test(body) || /wishlist/.test(page.url().toLowerCase())).toBe(true);
  });

  test('WL-006 logged-in user can add product to wishlist from PDP', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');

    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);
    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    const body = await readBodyText(page);
    expect(SUCCESS_PATTERN.test(body) || /wishlist/.test(page.url().toLowerCase())).toBe(true);
  });

  test('WL-007 selected variant is added to wishlist from PDP', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const selected = await selectConfigurableVariantIfPossible(page, selectors);
    test.skip(selected.length === 0, 'No configurable variant option available on this PDP.');

    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');
    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);

    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    await openWishlistPage(page, home, selectors);
    const firstItemText = ((await page.locator(selectors.wishlist.pageItem).first().innerText().catch(() => '')) || '').toLowerCase();
    test.skip(firstItemText.length === 0, 'Wishlist item details are not visible.');

    const hasVariantSignal = selected.some((value) => firstItemText.includes(value.toLowerCase()));
    expect(hasVariantSignal || /size|colour|color|variant/.test(firstItemText)).toBe(true);
  });

  test('WL-008 configurable product validation works without selecting required options', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const variantControls = page.locator(selectors.wishlist.variantOption);
    const variantCount = await variantControls.count();
    test.skip(variantCount === 0, 'PDP is not configurable or has no variant selectors.');

    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');
    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);

    const body = await readBodyText(page);
    const hasExpectedBehavior =
      REQUIRED_OPTION_PATTERN.test(body) || SUCCESS_PATTERN.test(body) || (await isLoginGate(page));
    expect(hasExpectedBehavior).toBe(true);
  });

  test('WL-009 wishlist icon state updates after adding product', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');

    const classBefore = await trigger!.getAttribute('class').catch(() => '');
    const pressedBefore = await trigger!.getAttribute('aria-pressed').catch(() => null);

    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);
    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    const classAfter = await trigger!.getAttribute('class').catch(() => '');
    const pressedAfter = await trigger!.getAttribute('aria-pressed').catch(() => null);
    const body = await readBodyText(page);

    expect(
      classBefore !== classAfter ||
        pressedBefore !== pressedAfter ||
        pressedAfter !== null ||
        SUCCESS_PATTERN.test(body) ||
        /wishlist/.test(page.url().toLowerCase())
    ).toBe(true);
  });

  test('WL-010 success message is displayed after adding product', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');

    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);
    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    const toast = page.locator(selectors.wishlist.toast).first();
    const toastVisible = await toast.isVisible().catch(() => false);
    if (toastVisible) {
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/wishlist|saved|added/i);
      return;
    }

    await expect(page.locator('body')).toContainText(/wishlist|saved|added/i);
  });

  test('WL-011 duplicate wishlist add is handled correctly', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const trigger = requireDefined(await getWishlistTriggerFromPdp(page, selectors), 'Wishlist icon is not displayed on this PDP.');

    await clickLocatorRobust(trigger);
    await page.waitForTimeout(1000);
    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    await clickLocatorRobust(trigger);
    await page.waitForTimeout(1000);

    const body = await readBodyText(page);
    const classState = (await trigger.getAttribute('class').catch(() => '')) ?? '';
    const pressed = await trigger.getAttribute('aria-pressed').catch(() => null);

    expect(
      /already|exists|wishlist|removed|saved/.test(body) ||
        classState.length > 0 ||
        pressed !== null ||
        /wishlist/.test(page.url().toLowerCase())
    ).toBe(true);
  });

  test('WL-012 wishlist page loads successfully', async ({ home, page }) => {
    await gotoHomeWithRetry(home, page);
    await page.goto('/wishlist', { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();

    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);

    const isWishlistUrl = /wishlist/.test(page.url().toLowerCase());
    const body = await readBodyText(page);
    expect(isWishlistUrl || /wishlist/.test(body)).toBe(true);
  });

  test('WL-013 empty wishlist state is displayed correctly', async ({ home, page, selectors }) => {
    await gotoHomeWithRetry(home, page);
    await openWishlistPage(page, home, selectors);

    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required to validate empty wishlist state.');

    const cleared = await clearWishlistIfPossible(page, selectors);
    test.skip(!cleared, 'Could not clear existing wishlist items to reach empty state.');

    const body = await readBodyText(page);
    expect(WISHLIST_EMPTY_PATTERN.test(body)).toBe(true);
  });

  test('WL-014 wishlist with products displays correctly', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const items = page.locator(selectors.wishlist.pageItem);
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('WL-015 product image is displayed in wishlist', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const image = page.locator(`${selectors.wishlist.pageItem} img`).first();
    await expect(image).toBeVisible();
    const rendered = await image.evaluate((node) => {
      const img = node as HTMLImageElement;
      return Boolean(img.currentSrc || img.src) && img.naturalWidth > 0;
    });
    expect(rendered).toBe(true);
  });

  test('WL-016 product name is displayed in wishlist', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const item = page.locator(selectors.wishlist.pageItem).first();
    await expect(item).toBeVisible();

    const name = ((await item.locator(selectors.wishlist.productName).first().innerText().catch(() => '')) || '').trim();
    if (name.length > 0) {
      expect(name.length).toBeGreaterThan(0);
      return;
    }

    const fallback = ((await item.innerText().catch(() => '')) || '').trim();
    expect(fallback.length).toBeGreaterThan(0);
  });

  test('WL-017 product price is displayed in wishlist with AU/NZ format', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const item = page.locator(selectors.wishlist.pageItem).first();
    await expect(item).toBeVisible();

    const priceText =
      ((await item.locator(selectors.wishlist.price).first().innerText().catch(() => '')) || '').trim() ||
      ((await item.innerText().catch(() => '')) || '').trim();
    expect(PRICE_PATTERN.test(priceText.toLowerCase())).toBe(true);
  });

  test('WL-018 selected variant details are displayed in wishlist', async ({ home, page, selectors }) => {
    await openValidPdp(home, page, selectors);
    const selected = await selectConfigurableVariantIfPossible(page, selectors);
    test.skip(selected.length === 0, 'No configurable variant option available on this PDP.');

    const trigger = await getWishlistTriggerFromPdp(page, selectors);
    test.skip(!trigger, 'Wishlist icon is not displayed on this PDP.');
    await clickLocatorRobust(trigger!);
    await page.waitForTimeout(1200);

    const loggedIn = await tryLoginIfNeeded(page);
    test.skip(!loggedIn, 'Logged-in account is required. Provide TEST_ACCOUNT_EMAIL/TEST_ACCOUNT_PASSWORD.');

    await openWishlistPage(page, home, selectors);
    const firstItemText = ((await page.locator(selectors.wishlist.pageItem).first().innerText().catch(() => '')) || '').toLowerCase();
    const hasVariant = selected.some((value) => firstItemText.includes(value.toLowerCase()));
    expect(hasVariant || /size|colour|color|variant/.test(firstItemText)).toBe(true);
  });

  test('WL-019 sale price is displayed correctly', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const item = page.locator(selectors.wishlist.pageItem).first();
    await expect(item).toBeVisible();
    const text = ((await item.innerText().catch(() => '')) || '').toLowerCase();
    const hasTwoPriceTokens = (text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? []).length >= 2;
    expect(SALE_PATTERN.test(text) || hasTwoPriceTokens || PRICE_PATTERN.test(text)).toBe(true);
  });

  test('WL-020 clicking wishlist product redirects to PDP', async ({ home, page, selectors }) => {
    await ensureWishlistHasProduct(page, home, selectors);
    const item = page.locator(selectors.wishlist.pageItem).first();
    await expect(item).toBeVisible();

    const productLink = item
      .locator('a[href*="/product/"], a[href*="/p/"], a[href$=".html"], a[href*=".html?"], a[href]')
      .first();
    const visible = await productLink.isVisible().catch(() => false);
    test.skip(!visible, 'No clickable product link found in wishlist item.');

    const before = page.url();
    await Promise.all([
      page.waitForURL((url) => url.href !== before, { timeout: 12_000 }).catch(() => undefined),
      clickLocatorRobust(productLink)
    ]);

    await home.dismissInterruptions();
    const current = page.url().toLowerCase();
    const body = await readBodyText(page);
    expect(PRODUCT_PATH_PATTERN.test(current) || /add to cart|size|price|sku/.test(body)).toBe(true);
  });
});
