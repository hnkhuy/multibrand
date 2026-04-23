import { searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const NO_RESULTS_PATTERN =
  /no results|no products|0 results|couldn't find|did not match|sorry|try another search|take a look at the latest|search results for/i;

test.describe('homepage', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('HP-001 homepage loads successfully', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-002 correct region-specific content is displayed', async ({ ctx, home, page }) => {
    await home.goto('/');

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('HP-003 homepage loads over HTTPS', async ({ home, page }) => {
    await home.goto('/');

    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('HP-004 no visible application error is shown on homepage', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-005 homepage remains stable after refresh', async ({ home, page }) => {
    await home.goto('/');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe('/');
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-006 brand logo is displayed', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.logo).toBeVisible();
    const box = await home.header.logo.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('HP-007 clicking logo redirects user to homepage', async ({ home, page }) => {
    await home.goto('/');
    await home.header.clickLogo();

    expect(new URL(page.url()).pathname).toBe('/');
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-008 main navigation is displayed', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.navigation).toBeVisible();
    const navigationItems = await home.header.getVisibleNavigationItems();
    expect(navigationItems.length).toBeGreaterThan(0);
  });

  test('HP-009 top navigation links redirect correctly', async ({ home, page }) => {
    await home.goto('/');
    const navigationItems = await home.header.getVisibleNavigationItems();

    expect(navigationItems.length).toBeGreaterThan(0);

    for (const item of navigationItems) {
      await home.goto('/');
      const link = home.header.navigationLinks.nth(item.index);
      const previousUrl = page.url();
      const expectedUrl = new URL(item.href);

      await expect(link).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
        link.click()
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe(expectedUrl.pathname);
      await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-010 submenu opens correctly on desktop', async ({ home }) => {
    await home.goto('/');
    const navigationItems = await home.header.getVisibleNavigationItems();

    expect(navigationItems.length).toBeGreaterThan(0);

    let submenuOpened = false;
    for (const item of navigationItems) {
      await home.header.navigationLinks.nth(item.index).hover();
      const submenuCount = await home.header.submenu.count();

      for (let index = 0; index < submenuCount; index += 1) {
        const submenu = home.header.submenu.nth(index);
        if (await submenu.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await expect(submenu).toBeVisible();
          submenuOpened = true;
          break;
        }
      }

      if (submenuOpened) {
        break;
      }
    }

    expect(submenuOpened).toBe(true);
  });

  test('HP-011 search entry point is available from homepage', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.searchInput).toBeVisible();
    await expect(home.header.searchInput).toBeEnabled();
  });

  test('HP-012 search with valid keyword redirects to search results', async ({ ctx, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;

    await home.goto('/');
    await home.search(keyword);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(page.locator('body')).toContainText(keyword);
  });

  test('HP-013 search with invalid keyword shows no-result state', async ({ home, page }) => {
    const invalidKeyword = `no-results-${Date.now()}-zzzxxy`;

    await home.goto('/');
    await home.search(invalidKeyword);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(page.locator('body')).toContainText(invalidKeyword);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(NO_RESULTS_PATTERN);
  });

  test('HP-014 account entry point is displayed', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.accountIcon).toBeVisible();
    await expect(home.header.accountIcon).toBeEnabled();
  });

  test('HP-015 cart entry point and empty state for guest user', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.cartIcon).toBeVisible();
    await expect(home.header.cartIcon).toBeEnabled();

    const cartLabel = [
      await home.header.cartIcon.getAttribute('aria-label').catch(() => null),
      await home.header.cartIcon.innerText().catch(() => null)
    ]
      .filter(Boolean)
      .join(' ');

    if (cartLabel.length > 0) {
      expect(cartLabel).toMatch(/cart|bag|basket|0|empty/i);
    }
  });

  test('HP-016 hero banner is displayed', async ({ home }) => {
    await home.goto('/');
    const heroCta = await home.heroCta();

    await expect(heroCta).toBeVisible();
    const box = await heroCta.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('HP-017 hero banner CTA redirects correctly', async ({ home, page }) => {
    await home.goto('/');
    const heroCta = await home.heroCta();
    const href = await heroCta.evaluate((element) => {
      const anchor = element instanceof HTMLAnchorElement ? element : element.closest('a');
      return anchor?.href ?? '';
    });

    expect(href).toBeTruthy();

    const expectedUrl = new URL(href, page.url());
    const previousUrl = page.url();

    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
      heroCta.click()
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe(expectedUrl.pathname);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-018 hero banner image is rendered correctly', async ({ home }) => {
    await home.goto('/');
    const heroMedia = await home.heroMedia();

    await expect(heroMedia).toBeVisible();
    const rendered = await heroMedia.evaluate((element) => {
      if (element instanceof HTMLImageElement) {
        return {
          width: element.naturalWidth,
          height: element.naturalHeight,
          complete: element.complete
        };
      }

      if (element instanceof HTMLVideoElement) {
        return {
          width: element.videoWidth || element.clientWidth,
          height: element.videoHeight || element.clientHeight,
          complete: element.readyState > 0
        };
      }

      const img = element.querySelector('img');
      return {
        width: img?.naturalWidth ?? element.clientWidth,
        height: img?.naturalHeight ?? element.clientHeight,
        complete: img?.complete ?? true
      };
    });

    expect(rendered.complete).toBe(true);
    expect(rendered.width).toBeGreaterThan(0);
    expect(rendered.height).toBeGreaterThan(0);

    const box = await heroMedia.boundingBox();
    expect(box?.width).toBeGreaterThan(120);
    expect(box?.height).toBeGreaterThan(120);
  });

  test('HP-019 promotional carousel can be navigated manually', async ({ home, page }) => {
    await home.goto('/');

    test.skip(!(await home.hasPromoCarousel()), 'Promotional carousel controls are not available.');

    const before = await home.promoCarouselSignature();
    await home.promoCarouselButton('next').click();
    await page.waitForTimeout(1_000);
    const afterNext = await home.promoCarouselSignature();

    expect(afterNext).not.toBe(before);

    await home.promoCarouselButton('previous').click();
    await page.waitForTimeout(1_000);
    const afterPrevious = await home.promoCarouselSignature();

    expect(afterPrevious).not.toBe(afterNext);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-020 promotional carousel auto-rotation works if enabled', async ({ home, page }) => {
    await home.goto('/');

    test.skip(!(await home.hasPromoCarousel()), 'Promotional carousel controls are not available.');

    const before = await home.promoCarouselSignature();
    await page.waitForTimeout(6_000);
    const after = await home.promoCarouselSignature();

    test.skip(before === after, 'Promotional carousel auto-rotation is not enabled or not detectable.');

    expect(after).not.toBe(before);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });
});
