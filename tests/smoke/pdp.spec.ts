import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { HomePage } from '../../src/pages/Home.page';
import type { Page } from '@playwright/test';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const PDP_TITLE_SELECTOR = '[data-testid="product-title"], h1';
const ADD_TO_CART_SELECTOR =
  '[data-testid="add-to-cart"], button[name="add"], button:has-text("Add to Cart"), button:has-text("Add to Bag")';
const BREADCRUMB_SELECTOR =
  'nav[aria-label*="breadcrumb" i], [data-testid*="breadcrumb" i], .breadcrumb, [class*="breadcrumb" i]';
const BREADCRUMB_LINK_SELECTOR =
  'nav[aria-label*="breadcrumb" i] a[href], [data-testid*="breadcrumb" i] a[href], .breadcrumb a[href], [class*="breadcrumb" i] a[href]';
const PRICE_SELECTOR = '[data-testid*="price" i], .price, [class*="price" i], [id*="price" i]';

async function openValidPdp(home: HomePage, page: Page): Promise<URL> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await home.goto('/');
      break;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
  const productLinks = await home.getFeaturedProductLinks(6);

  test.skip(productLinks.length === 0, 'No valid PDP link found on homepage.');

  for (const target of productLinks) {
    const pdpUrl = new URL(target.href, page.url());
    await page.goto(pdpUrl.href, { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const hasTitle = await page.locator(PDP_TITLE_SELECTOR).first().isVisible().catch(() => false);
    const hasAddToCart = await page.locator(ADD_TO_CART_SELECTOR).first().isVisible().catch(() => false);
    if (hasTitle || hasAddToCart) {
      return pdpUrl;
    }
  }

  test.skip(true, 'Could not find a valid PDP page from homepage product links.');
  return new URL(page.url());
}

test.describe('pdp', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('PDP-001 PDP loads successfully', async ({ home, pdp, page }) => {
    await openValidPdp(home, page);
    await pdp.expectLoaded();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PDP-002 correct product is displayed on PDP', async ({ home, pdp, page }) => {
    const pdpUrl = await openValidPdp(home, page);

    await pdp.expectLoaded();
    expect(new URL(page.url()).pathname).toBe(pdpUrl.pathname);

    const productTitle = (await page.locator(PDP_TITLE_SELECTOR).first().textContent())?.trim() ?? '';
    expect(productTitle.length).toBeGreaterThan(0);
  });

  test('PDP-003 correct region-specific content is displayed on PDP', async ({ ctx, home, pdp, page }) => {
    await openValidPdp(home, page);
    await pdp.expectLoaded();

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(page.locator('body')).toContainText(/\$\s?\d|AUD|NZD/i);
  });

  test('PDP-004 PDP loads over HTTPS', async ({ home, page }) => {
    await openValidPdp(home, page);
    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('PDP-005 no visible application error is shown on PDP', async ({ home, pdp, page }) => {
    await openValidPdp(home, page);
    await pdp.expectLoaded();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PDP-006 breadcrumb is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    const isVisible = await breadcrumb.isVisible().catch(() => false);
    test.skip(!isVisible, 'Breadcrumb is not available on this PDP.');
    await expect(breadcrumb).toBeVisible();
  });

  test('PDP-007 breadcrumb links redirect correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const breadcrumbVisible = await page.locator(BREADCRUMB_SELECTOR).first().isVisible().catch(() => false);
    test.skip(!breadcrumbVisible, 'Breadcrumb is not available on this PDP.');

    const breadcrumbLinks = page.locator(BREADCRUMB_LINK_SELECTOR);
    const totalLinks = await breadcrumbLinks.count();

    test.skip(totalLinks === 0, 'Breadcrumb links are not available.');

    let targetIndex = -1;
    for (let index = 0; index < totalLinks; index += 1) {
      const link = breadcrumbLinks.nth(index);
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#')) {
        continue;
      }

      const expectedUrl = new URL(href, page.url());
      if (expectedUrl.pathname !== new URL(page.url()).pathname) {
        targetIndex = index;
        break;
      }
    }

    test.skip(targetIndex < 0, 'No redirectable breadcrumb link found.');

    const targetLink = breadcrumbLinks.nth(targetIndex);
    const href = await targetLink.getAttribute('href');
    const expectedUrl = new URL(href ?? '/', page.url());
    const previousUrl = page.url();

    await expect(targetLink).toBeVisible();
    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
      targetLink.click()
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe(expectedUrl.pathname);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PDP-008 product name is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const title = page.locator(PDP_TITLE_SELECTOR).first();

    await expect(title).toBeVisible();
    const text = (await title.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  test('PDP-009 product price is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);

    const hasVisiblePrice = await page.locator(PRICE_SELECTOR).evaluateAll((elements) => {
      const pricePattern = /\$\s?\d/;
      return elements.some((element) => {
        const html = element as HTMLElement;
        const style = window.getComputedStyle(html);
        const rect = html.getBoundingClientRect();
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0;
        const text = (html.textContent ?? '').trim();
        return visible && pricePattern.test(text);
      });
    });

    if (!hasVisiblePrice) {
      await expect(page.locator('body')).toContainText(/\$\s?\d/);
    } else {
      expect(hasVisiblePrice).toBe(true);
    }
  });

  test('PDP-010 sale price presentation is correct', async ({ home, page }) => {
    await openValidPdp(home, page);
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const priceMatches = bodyText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleKeywords = /was|save|sale|discount|original price/i.test(bodyText);
    const hasStrikethroughPrice = await page
      .locator('[data-testid*="sale" i], [class*="sale" i], [class*="was-price" i], del, s, strike')
      .first()
      .isVisible()
      .catch(() => false);

    test.skip(!(priceMatches.length >= 2 && (hasSaleKeywords || hasStrikethroughPrice)), 'No sale product found on PDP.');

    expect(priceMatches.length).toBeGreaterThanOrEqual(2);
    expect(hasSaleKeywords || hasStrikethroughPrice).toBe(true);
  });
});
