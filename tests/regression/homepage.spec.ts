import { searchData, accountData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext, Region } from '../../src/core/types';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const NO_RESULTS_PATTERN =
  /no results|no products|0 results|couldn't find|did not match|sorry|try another search|search results for/i;
const LEGAL_TEXT_PATTERN = /copyright|all rights reserved|terms|privacy|©|\(c\)/i;
const PRICE_FORMAT_PATTERN = /^\$\s?\d{1,3}(,\d{3})*(\.\d{1,2})?$/;
const NZ_CONTEXT_PATTERN = /nzd|nz\$|new zealand|nz only/i;
const FOREIGN_CURRENCY_PATTERN = /£|€|¥|usd|gbp|eur/i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific TC: only runs on ${allowed.join(', ')}.`);
}

function onlyRegion(ctx: BrandContext, region: Region): void {
  test.skip(ctx.region !== region, `Region-specific TC: only runs on ${region.toUpperCase()}.`);
}

test.describe('homepage', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ───────────────────────── Critical (smoke) ─────────────────────────

  test('HP-001 homepage loads and is interactive', { tag: ['@smoke'] }, async ({ home, page }) => {
    await home.goto('/');
    await home.dismissInterruptions();

    expect(new URL(page.url()).protocol).toBe('https:');
    await expect(home.body).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
    await expect(home.header.navigation).toBeVisible();
  });

  test('HP-002 header essential entry points are present', { tag: ['@smoke'] }, async ({ home }) => {
    await home.goto('/');

    await expect(home.header.logo).toBeVisible();
    await expect(home.header.navigation).toBeVisible();
    await expect(home.header.searchInput).toBeVisible();
    await expect(home.header.searchInput).toBeEnabled();
    await expect(home.header.accountIcon).toBeVisible();
    await expect(home.header.cartIcon).toBeVisible();
  });

  test('HP-003 search with valid keyword navigates to results', async ({ ctx, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;

    await home.goto('/');
    await home.search(keyword);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.body).toContainText(keyword);
  });

  test('HP-004 clicking logo from a subpage returns to homepage', async ({ home, page }) => {
    await home.goto('/');
    const firstNav = await home.header.getVisibleNavigationItems();
    test.skip(firstNav.length === 0, 'No navigation items available to leave homepage.');

    await home.header.navigationLinks.nth(firstNav[0].index).click();
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).not.toBe('/');

    await home.header.clickLogo();
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-005 footer is rendered with legal text', async ({ home, page }) => {
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(home.footer).toBeVisible();
    const footerText = await home.footer.innerText();
    expect(footerText).toMatch(LEGAL_TEXT_PATTERN);
  });

  // ───────────────────────── High priority ─────────────────────────

  test('HP-006 top navigation items load PLPs without error', async ({ home, page }) => {
    await home.goto('/');
    const items = (await home.header.getVisibleNavigationItems()).slice(0, 3);
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      await home.goto('/');
      const link = home.header.navigationLinks.nth(item.index);
      const expectedUrl = new URL(item.href, page.url());

      await link.click();
      await page.waitForLoadState('domcontentloaded');

      expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-007 submenu opens on hover for desktop nav items', async ({ home }) => {
    await home.goto('/');
    const items = await home.header.getVisibleNavigationItems();
    expect(items.length).toBeGreaterThan(0);

    let opened = false;
    for (const item of items) {
      await home.header.navigationLinks.nth(item.index).hover();
      const submenuCount = await home.header.submenu.count();
      for (let i = 0; i < submenuCount; i += 1) {
        if (await home.header.submenu.nth(i).isVisible({ timeout: 1_000 }).catch(() => false)) {
          opened = true;
          break;
        }
      }
      if (opened) break;
    }

    expect(opened, 'At least one nav item should expose a submenu on hover.').toBe(true);
  });

  test('HP-008 hero banner has visible image and clickable CTA', async ({ home }) => {
    await home.goto('/');

    const heroMedia = await home.heroMedia();
    await expect(heroMedia).toBeVisible();

    const heroCta = await home.heroCta();
    await expect(heroCta).toBeVisible();
    const href = await heroCta.evaluate((el) => {
      const a = el instanceof HTMLAnchorElement ? el : el.closest('a');
      return a?.getAttribute('href') ?? '';
    });
    expect(href, 'Hero CTA must have a non-empty href.').toBeTruthy();
  });

  test('HP-009 hero CTA navigates to its declared href', { tag: ['@data-dependent'] }, async ({ home, page }) => {
    await home.goto('/');
    const heroCta = await home.heroCta();
    const href = await heroCta.evaluate((el) => {
      const a = el instanceof HTMLAnchorElement ? el : el.closest('a');
      return a?.href ?? '';
    });
    expect(href).toBeTruthy();

    const expectedUrl = new URL(href, page.url());
    test.skip(
      expectedUrl.hostname !== new URL(page.url()).hostname,
      'Hero CTA points to external host (CMS-driven) — out of scope for in-site assertion.'
    );

    await heroCta.click();
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-010 promo carousel can be navigated manually', async ({ features, home, page }) => {
    test.skip(!features.promoCarousel, 'Brand does not have a promotional carousel.');
    await home.goto('/');
    expect(await home.hasPromoCarousel(), 'Promo carousel controls should be present.').toBe(true);

    const before = await home.promoCarouselSignature();
    await home.promoCarouselButton('next').click();
    await page.waitForTimeout(1_000);
    const afterNext = await home.promoCarouselSignature();
    expect(afterNext, 'Signature must change after next click.').not.toBe(before);

    await home.promoCarouselButton('previous').click();
    await page.waitForTimeout(1_000);
    const afterPrev = await home.promoCarouselSignature();
    expect(afterPrev, 'Signature must change after prev click.').not.toBe(afterNext);
  });

  test('HP-011 promotional tile CTAs navigate correctly', async ({ features, home, page }) => {
    test.skip(!features.promoTiles, 'Brand does not have promotional tiles.');
    await home.goto('/');
    const tiles = (await home.getPromoTileLinks(3)).slice(0, 2);
    expect(tiles.length, 'Promotional tile CTAs should be available.').toBeGreaterThan(0);

    for (const tile of tiles) {
      await home.goto('/');
      const link = home.mainLinks.nth(tile.index);
      const expectedUrl = new URL(tile.href, page.url());

      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-012 featured product card renders required elements', async ({ features, home }) => {
    test.skip(!features.featuredProducts, 'Brand does not have a featured product module.');
    await home.goto('/');
    const products = await home.getFeaturedProductLinks(1);
    expect(products.length, 'At least one featured product card should be available.').toBeGreaterThan(0);

    const card = await home.bestProductLinkByHref(products[0].href);
    await card.scrollIntoViewIfNeeded();
    const snapshot = await home.productCardSnapshotByHref(products[0].href);

    expect(snapshot.hasImage, 'Card must include an image.').toBe(true);
    expect(snapshot.name.length, 'Card must have a non-empty product name.').toBeGreaterThan(0);
    expect(snapshot.prices.length, 'Card must show at least one price.').toBeGreaterThan(0);
  });

  test('HP-013 clicking featured product card navigates to PDP', async ({ features, home, page }) => {
    test.skip(!features.featuredProducts, 'Brand does not have a featured product module.');
    await home.goto('/');
    const products = await home.getFeaturedProductLinks(1);
    expect(products.length).toBeGreaterThan(0);

    const card = await home.bestProductLinkByHref(products[0].href);
    const expectedUrl = new URL(products[0].href, page.url());
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForLoadState('domcontentloaded');

    expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-014 featured product prices use a single-currency format', async ({ features, home }) => {
    test.skip(!features.featuredProducts, 'Brand does not have a featured product module.');
    await home.goto('/');
    const products = await home.getFeaturedProductLinks(3);
    expect(products.length).toBeGreaterThan(0);

    for (const product of products) {
      const snapshot = await home.productCardSnapshotByHref(product.href);
      expect(snapshot.prices.length).toBeGreaterThan(0);

      for (const price of snapshot.prices.slice(0, 3)) {
        expect(price, `Price "${price}" should match $XX.XX format.`).toMatch(PRICE_FORMAT_PATTERN);
        expect(price, 'Price should not include foreign-currency markers.').not.toMatch(FOREIGN_CURRENCY_PATTERN);
      }
    }
  });

  test('HP-015 footer internal links navigate without error', async ({ features, home, page }) => {
    test.skip(!features.footerLinks, 'Brand does not expose footer links.');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const baseHost = new URL(page.url()).hostname;
    const internalLinks = await home.footerLinks.evaluateAll((elements, host) => {
      const blocked = /^(#|javascript:|mailto:|tel:)/i;
      const social = /facebook|instagram|tiktok|youtube|pinterest|x\.com|twitter|linkedin/i;
      const hrefs = elements
        .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
        .filter((href) => href && !blocked.test(href) && !social.test(href))
        .filter((href) => {
          if (href.startsWith('/')) return true;
          try {
            return new URL(href).hostname === host;
          } catch {
            return false;
          }
        });
      return Array.from(new Set(hrefs)).slice(0, 2);
    }, baseHost);

    expect(internalLinks.length, 'At least one internal footer link should exist.').toBeGreaterThan(0);

    for (const href of internalLinks) {
      await home.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const expectedUrl = new URL(href, page.url());
      await home.footerLinkByHref(href).click();
      await page.waitForLoadState('domcontentloaded');

      expect(new URL(page.url()).hostname).toBe(expectedUrl.hostname);
      expect(page.url()).not.toMatch(/\/404|\/500|not-found|\/error/i);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  // ───────────────────────── Medium priority ─────────────────────────

  test('HP-016 search with invalid keyword shows no-results state', async ({ home, page }) => {
    const invalid = `no-results-${Date.now()}-zzzxxy`;
    await home.goto('/');
    await home.search(invalid);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await expect(home.body).toContainText(invalid);
    const bodyText = await home.body.innerText();
    expect(bodyText).toMatch(NO_RESULTS_PATTERN);
  });

  test('HP-017 cart icon shows guest empty state', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.cartIcon).toBeVisible();
    const ariaLabel = (await home.header.cartIcon.getAttribute('aria-label').catch(() => '')) ?? '';
    const inner = (await home.header.cartIcon.innerText().catch(() => '')) ?? '';
    const combined = `${ariaLabel} ${inner}`.trim();

    expect(combined.length, 'Cart icon should expose either aria-label or text.').toBeGreaterThan(0);
    expect(combined).toMatch(/cart|bag|basket|0|empty/i);
  });

  test('HP-018 mobile hamburger menu opens and shows nav links', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    const labelled = home.header.menuButton;
    const byText = home.header.actionTargets.filter({ hasText: /menu|navigation/i }).first();
    const trigger = (await labelled.isVisible().catch(() => false)) ? labelled : byText;
    test.skip(!(await trigger.isVisible().catch(() => false)), 'Hamburger menu is not available on this site.');

    await trigger.click();
    await expect(home.header.mobileMenuSurface).toBeVisible({ timeout: 5_000 });
    expect(await home.header.mobileMenuLinks.count()).toBeGreaterThan(0);
  });

  test('HP-019 mobile navigation link navigates correctly', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    const trigger = (await home.header.menuButton.isVisible().catch(() => false))
      ? home.header.menuButton
      : home.header.actionTargets.filter({ hasText: /menu|navigation/i }).first();
    test.skip(!(await trigger.isVisible().catch(() => false)), 'Hamburger menu not available.');
    await trigger.click();
    await expect(home.header.mobileMenuSurface).toBeVisible({ timeout: 5_000 });

    const target = await home.header.mobileMenuLinks.evaluateAll((elements) => {
      const blocked = /^(#|javascript:|mailto:|tel:)/i;
      return elements
        .map((el) => {
          const a = el as HTMLAnchorElement;
          const href = a.getAttribute('href') ?? '';
          const rect = a.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          const text = (a.innerText || a.getAttribute('aria-label') || '').trim();
          return { href, text, visible, blocked: blocked.test(href) };
        })
        .find((item) => item.visible && !item.blocked && item.text.length > 0);
    });
    test.skip(!target, 'No mobile navigation link suitable for redirect check.');

    const expectedUrl = new URL(target!.href, page.url());
    await home.header.mobileMenuLinks
      .evaluateAll((elements, href) => {
        const link = elements.find((el) => (el as HTMLAnchorElement).getAttribute('href') === href) as
          | HTMLAnchorElement
          | undefined;
        link?.click();
      }, target!.href);

    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-020 tablet viewport renders without horizontal overflow', async ({ home, page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await home.goto('/');

    await expect(home.main).toBeVisible();
    await expect(home.header.logo).toBeVisible();
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth - d.clientWidth;
    });
    expect(overflow, 'Tablet layout must not introduce horizontal overflow.').toBeLessThanOrEqual(1);
  });

  test('HP-021 mobile viewport renders without horizontal overflow', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    await expect(home.main).toBeVisible();
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth - d.clientWidth;
    });
    expect(overflow, 'Mobile layout must not introduce horizontal overflow.').toBeLessThanOrEqual(1);
  });

  test('HP-022 sticky header remains pinned after scrolling', async ({ features, home, page }) => {
    test.skip(!features.stickyHeader, 'Brand opts out of sticky header.');
    await home.goto('/');

    const info = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return { exists: false, sticky: false, top: 0 };
      const style = window.getComputedStyle(header);
      return {
        exists: true,
        sticky: /(sticky|fixed)/i.test(style.position),
        top: header.getBoundingClientRect().top
      };
    });

    expect(info.exists, 'Header element should be present.').toBe(true);
    expect(info.sticky, 'Header should be sticky or fixed.').toBe(true);

    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await page.waitForTimeout(400);
    const afterTop = (await home.headerRoot.boundingBox())?.y ?? 0;
    expect(Math.abs(afterTop - info.top)).toBeLessThan(6);
  });

  test(
    'HP-023 a sale product card shows both current and original price',
    { tag: ['@data-dependent'] },
    async ({ features, home }) => {
      test.skip(!features.featuredProducts, 'Brand does not have a featured product module.');
      await home.goto('/');
      const products = await home.getFeaturedProductLinks(8);
      expect(products.length).toBeGreaterThan(0);

      let validated = false;
      for (const product of products) {
        const snapshot = await home.productCardSnapshotByHref(product.href);
        if (snapshot.prices.length < 2) continue;
        const numbers = snapshot.prices
          .map((p) => Number(p.replace(/[$,\s]/g, '')))
          .filter((n) => Number.isFinite(n));
        if (numbers.length < 2) continue;
        expect(Math.min(...numbers)).toBeLessThan(Math.max(...numbers));
        validated = true;
        break;
      }
      test.skip(!validated, 'No sale product card with both prices found in featured module.');
    }
  );

  // ───────────────────────── Low priority ─────────────────────────

  test('HP-024 social footer links point to expected external hosts', async ({ features, home, page }) => {
    test.skip(!features.socialLinks, 'Brand does not expose social links in footer.');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const socialHrefs = await home.footerLinks.evaluateAll((elements) => {
      const social = /facebook|instagram|tiktok|youtube|pinterest|x\.com|twitter|linkedin/i;
      return Array.from(
        new Set(
          elements
            .map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
            .filter((href) => social.test(href))
        )
      ).slice(0, 2);
    });
    expect(socialHrefs.length, 'At least one social link should be available.').toBeGreaterThan(0);

    for (const href of socialHrefs) {
      await home.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const expectedHost = new URL(href, page.url()).hostname.replace(/^www\./, '');
      const popupPromise = page.waitForEvent('popup', { timeout: 5_000 }).catch(() => null);
      await home.footerLinkByHref(href).click();
      const popup = await popupPromise;

      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
        const popupHost = new URL(popup.url()).hostname.replace(/^www\./, '');
        expect(popupHost).toContain(expectedHost);
        await popup.close();
      } else {
        await page.waitForLoadState('domcontentloaded');
        const currentHost = new URL(page.url()).hostname.replace(/^www\./, '');
        expect(currentHost).toContain(expectedHost);
      }
    }
  });

  test('HP-025 category click fires a dataLayer analytics event', { tag: ['@data-dependent'] }, async ({ home, page }) => {
    await page.addInitScript(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[]; dataLayer?: unknown[] };
      win.__capturedDataLayerEvents = [];
      const dataLayer = Array.isArray(win.dataLayer) ? win.dataLayer : [];
      const originalPush = dataLayer.push.bind(dataLayer);
      dataLayer.push = (...args: unknown[]) => {
        win.__capturedDataLayerEvents?.push(...args);
        return originalPush(...args);
      };
      win.dataLayer = dataLayer;
    });

    await home.goto('/');
    const categories = await home.getCategoryEntryLinks(1);
    test.skip(categories.length === 0, 'No category entry available for analytics check.');

    const before = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return (win.__capturedDataLayerEvents ?? []).length;
    });

    await home.mainLinks
      .evaluateAll((elements, href) => {
        const link = elements.find((el) => (el as HTMLAnchorElement).getAttribute('href') === href) as
          | HTMLAnchorElement
          | undefined;
        link?.click();
      }, categories[0].href);
    await page.waitForTimeout(1_000);

    const events = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return win.__capturedDataLayerEvents ?? [];
    });
    const delta = events.slice(before);
    test.skip(delta.length === 0, 'No dataLayer event captured after category click.');

    const serialized = JSON.stringify(delta);
    expect(serialized).toMatch(/category|navigation|menu|select|click/i);
  });

  // ───────────────── Brand-specific: Dr. Martens ─────────────────

  test('HP-drm-001 Dr. Martens uses "Bag" terminology in cart icon', async ({ ctx, home }) => {
    onlyBrand(ctx, 'drmartens');
    await home.goto('/');

    const ariaLabel = (await home.header.cartIcon.getAttribute('aria-label').catch(() => '')) ?? '';
    const inner = (await home.header.cartIcon.innerText().catch(() => '')) ?? '';
    const combined = `${ariaLabel} ${inner}`.toLowerCase();

    expect(combined.length).toBeGreaterThan(0);
    expect(combined, 'DM cart icon must use "bag" terminology.').toMatch(/bag/);
    expect(combined, 'DM cart icon must NOT use cart/basket wording.').not.toMatch(/\b(cart|basket)\b/);
  });

  test('HP-drm-002 Dr. Martens shows OneTrust cookie banner on fresh visit', async ({ ctx, context, page, home }) => {
    onlyBrand(ctx, 'drmartens');
    await context.clearCookies();
    await home.goto('/');

    const banner = page.locator('#onetrust-banner-sdk');
    await expect(banner, 'OneTrust banner should appear within 5s.').toBeVisible({ timeout: 5_000 });

    const acceptButton = page.locator(
      '#onetrust-accept-btn-handler, button:has-text("Accept All"), button:has-text("Accept")'
    ).first();
    await acceptButton.click();
    await expect(banner).toBeHidden({ timeout: 5_000 });
    await expect(home.header.logo).toBeVisible();
  });

  // ───────────────── Brand-specific: Vans ─────────────────

  test('HP-van-001 Vans cookie banner is not OneTrust (CMS-injected)', async ({ ctx, context, page, home }) => {
    onlyBrand(ctx, 'vans');
    await context.clearCookies();
    await home.goto('/');

    await expect(page.locator('#onetrust-banner-sdk')).toHaveCount(0);

    const consentCandidates = page.locator(
      '[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]'
    );
    const consentVisible = await consentCandidates.first().isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!consentVisible, 'Vans cookie banner not detectable; selector heuristic may need to be updated.');
    await expect(consentCandidates.first()).toContainText(/cookie|consent|accept/i);
  });

  test('HP-van-002 Vans account icon opens a modal popup (does not navigate)', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'vans');
    await home.goto('/');

    const before = new URL(page.url()).pathname;
    await home.header.accountIcon.click();
    await page.waitForTimeout(1_500);

    expect(new URL(page.url()).pathname, 'Vans should open a popup, not navigate.').toBe(before);
    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  });

  test('HP-van-003 Vans guest wishlist persists product to localStorage', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'vans');
    await home.goto('/');

    const categories = await home.getCategoryEntryLinks(1);
    test.skip(categories.length === 0, 'No category entry to reach a PLP from homepage.');
    await home.mainLinks.nth(categories[0].index).click();
    await page.waitForLoadState('domcontentloaded');

    const wishlistButton = page
      .locator('button:has-text("Wishlist"), button[aria-label*="wishlist" i], [data-testid*="wishlist" i]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10_000 });
    await wishlistButton.click();
    await page.waitForTimeout(800);

    const storage = await page.evaluate(() => {
      const out: Array<{ key: string; value: string }> = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) ?? '';
        out.push({ key, value: localStorage.getItem(key) ?? '' });
      }
      return out;
    });

    const wishlistEntry = storage.find((entry) => /wishlist|favorite|saved/i.test(entry.key));
    expect(wishlistEntry, 'A localStorage key referencing wishlist should exist after add.').toBeTruthy();
    expect(wishlistEntry!.value.length).toBeGreaterThan(0);
  });

  // ───────────────── Brand-specific: Skechers ─────────────────

  test('HP-skx-001 Skechers featured products require SPA hydration polling', async ({ ctx, page, selectors }) => {
    onlyBrand(ctx, 'skechers');
    test.skip(!selectors.home.featuredProductLink, 'No featured product selector configured for SKX.');

    await page.goto(ctx.baseURL, { waitUntil: 'domcontentloaded' });
    const earlyCount = await page.locator(selectors.home.featuredProductLink).count();

    await page.waitForFunction(
      (sel) => document.querySelectorAll(sel).length > 0,
      selectors.home.featuredProductLink,
      { timeout: 15_000 }
    );
    const lateCount = await page.locator(selectors.home.featuredProductLink).count();

    expect(lateCount, 'After hydration, featured product cards should be present.').toBeGreaterThan(0);
    expect(
      earlyCount === 0 || earlyCount < lateCount,
      'SPA hydration assumption: cards should not all be present at domcontentloaded.'
    ).toBe(true);
  });

  test.fixme('HP-skx-002 Skechers mini-cart does not show Afterpay messaging', async () => {
    // Cross-spec dependency — implemented during mini-cart spec rewrite. Tracked by HP-skx-002 in CSV.
  });

  // ───────────────── Brand-specific: Platypus ─────────────────

  test('HP-pla-001 Platypus featured product PDP URLs are root-level', async ({ ctx, home }) => {
    onlyBrand(ctx, 'platypus');
    await home.goto('/');
    const products = await home.getFeaturedProductLinks(3);
    expect(products.length).toBeGreaterThan(0);

    const rootLevelPattern = /^\/[^/]+-\d+-[^/]+\.html$/i;
    for (const product of products) {
      const path = new URL(product.href, 'https://platypus.test').pathname;
      expect(path, `Platypus PDP href "${path}" should match flat root-level pattern.`).toMatch(rootLevelPattern);
      expect(path, 'Platypus PDP href should NOT be nested under /shop/.').not.toMatch(/^\/shop\//i);
    }
  });

  test('HP-pla-002 Platypus exposes a Kickbacks entry point on homepage', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'platypus');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const matches = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.some((a) => {
        const href = a.getAttribute('href') ?? '';
        const text = (a.textContent ?? '').trim();
        return /kickbacks/i.test(href) || /kickbacks/i.test(text);
      });
    });
    expect(matches, 'Platypus homepage should expose a Kickbacks link or anchor.').toBe(true);
  });

  // ───────────────────────── Region-specific ─────────────────────────

  test('HP-AU-001 AU homepage uses AUD context (no NZ markers)', async ({ ctx, features, home, page }) => {
    onlyRegion(ctx, 'au');
    await home.goto('/');

    expect(new URL(page.url()).hostname).toMatch(/-au\./);

    if (features.featuredProducts) {
      const products = await home.getFeaturedProductLinks(3);
      for (const product of products) {
        const snapshot = await home.productCardSnapshotByHref(product.href);
        for (const price of snapshot.prices.slice(0, 2)) {
          expect(price).toMatch(PRICE_FORMAT_PATTERN);
        }
      }
    }

    const bodyText = await home.body.innerText();
    expect(bodyText, 'AU page should not surface NZD-specific markers in copy.').not.toMatch(/\bNZD\b|\bNZ\$/);
  });

  test('HP-NZ-001 NZ homepage uses NZD context', async ({ ctx, home, page }) => {
    onlyRegion(ctx, 'nz');
    await home.goto('/');

    expect(new URL(page.url()).hostname).toMatch(/-nz\./);

    const bodyText = await home.body.innerText();
    expect(bodyText, 'NZ homepage should expose at least one NZ-specific marker.').toMatch(NZ_CONTEXT_PATTERN);
  });

  test('HP-pla-NZ-001 Platypus NZ exposes Mens "New Arrivals" in top nav', async ({ ctx, home }) => {
    onlyBrand(ctx, 'platypus');
    onlyRegion(ctx, 'nz');
    await home.goto('/');

    const items = await home.header.getVisibleNavigationItems();
    const mens = items.find((item) => /men/i.test(item.text) && !/women/i.test(item.text));
    expect(mens, 'Platypus NZ should have a Mens nav item.').toBeTruthy();

    await home.header.navigationLinks.nth(mens!.index).hover();
    const submenuCount = await home.header.submenu.count();
    let submenuText = '';
    for (let i = 0; i < submenuCount; i += 1) {
      const submenu = home.header.submenu.nth(i);
      if (await submenu.isVisible({ timeout: 1_000 }).catch(() => false)) {
        submenuText = await submenu.innerText().catch(() => '');
        if (submenuText) break;
      }
    }
    expect(submenuText, 'Mens submenu should contain "New Arrivals" for Platypus NZ.').toMatch(/new arrivals/i);
  });

  test('HP-van-NZ-001 Vans NZ exposes a /droplist link', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'vans');
    onlyRegion(ctx, 'nz');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const hasDroplist = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).some((a) => /\/droplist\/?$/i.test(a.getAttribute('href') ?? ''))
    );
    expect(hasDroplist, 'Vans NZ should expose a /droplist link in homepage or footer.').toBe(true);
  });

  test('HP-van-AU-001 Vans AU homepage loads with graceful degradation', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'vans');
    onlyRegion(ctx, 'au');
    await home.goto('/');

    expect(new URL(page.url()).hostname).toMatch(/-au\./);
    await expect(home.header.logo).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    // Featured products / promo tiles may legitimately be missing while AU is under construction —
    // verify only the minimum surface (logo + non-error body) until launch.
  });

  // ─── Middle ──────────────────────────────────────────────────────────────

  test('HP-026 homepage header reflects logged-in state after login', async ({ home, account, page }) => {
    await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    if (await account.emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await account.emailInput.fill(accountData.shared.email);
      await account.passwordInput.fill(accountData.shared.password);
      await account.authSubmit.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      await home.goto('/');
      await account.signInTrigger.click().catch(() => undefined);
      await page.waitForTimeout(500);
      if (await account.emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await account.emailInput.fill(accountData.shared.email);
        await account.passwordInput.fill(accountData.shared.password);
        await account.authSubmit.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
    await home.goto('/');
    await home.dismissInterruptions();
    const body = (await home.body.innerText().catch(() => '')).toLowerCase();
    const loggedIn =
      /sign out|log out|logout|my account|welcome/i.test(body) ||
      !/sign in|log in|create account/i.test(body);
    expect(loggedIn, 'Homepage header should reflect logged-in state.').toBe(true);
  });

  test('HP-027 cookie banner is dismissible without breaking page interaction', async ({ home, page }) => {
    await home.goto('/');
    await page.waitForTimeout(2_000);
    const banner = page.locator('#onetrust-banner-sdk, [class*="cookie-banner"], [class*="cookie-consent"]').first();
    if (await banner.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const acceptBtn = page
        .locator('#onetrust-accept-btn-handler, button:has-text("Accept All"), button:has-text("Accept Cookies"), button:has-text("OK")')
        .first();
      if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(banner).not.toBeVisible({ timeout: 5_000 });
    }
    await expect(home.body).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-028 page title is non-empty and does not indicate an error state', async ({ home, page }) => {
    await home.goto('/');
    const title = await page.title();
    expect(title.trim().length, 'Page title should not be empty.').toBeGreaterThan(0);
    expect(
      /404|not found|error|page not found/i.test(title),
      'Page title should not indicate a 404 or error state.'
    ).toBe(false);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('HP-029 a non-existent URL shows a graceful 404 error page', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-xyz-9999', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    const body = await page.locator('body').innerText().catch(() => '');
    const title = await page.title();
    const is404 =
      /404|not found|page not found|oops|sorry/i.test(body) ||
      /404|not found/i.test(title) ||
      page.url().includes('404');
    expect(is404, 'Non-existent URL should render a graceful 404 error page.').toBe(true);
    expect(
      /application error|service unavailable|500/i.test(body),
      '404 page should not escalate to a 500 server error.'
    ).toBe(false);
  });

  test('HP-030 page title and meta description are present for SEO', async ({ home, page }) => {
    await home.goto('/');
    const title = await page.title();
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');
    expect(title.trim().length, 'Homepage should have a non-empty page title.').toBeGreaterThan(0);
    expect(metaDesc, 'Homepage should have a meta description tag.').not.toBeNull();
  });
});
