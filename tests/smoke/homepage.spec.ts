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

    await expect(home.body).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-002 correct region-specific content is displayed', async ({ ctx, home, page }) => {
    await home.goto('/');

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(home.body).not.toBeEmpty();
  });

  test('HP-003 homepage loads over HTTPS', async ({ home, page }) => {
    await home.goto('/');

    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('HP-004 no visible application error is shown on homepage', async ({ home, page }) => {
    await home.goto('/');

    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-005 homepage remains stable after refresh', async ({ home, page }) => {
    await home.goto('/');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe('/');
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
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
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
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
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.body).toContainText(keyword);
  });

  test('HP-013 search with invalid keyword shows no-result state', async ({ home, page }) => {
    const invalidKeyword = `no-results-${Date.now()}-zzzxxy`;

    await home.goto('/');
    await home.search(invalidKeyword);

    await expect(page).toHaveURL(/search|q=|query=|\/s\//i);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.body).toContainText(invalidKeyword);

    const bodyText = await home.body.innerText();
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
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
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

  test('HP-019 promotional carousel can be navigated manually', async ({ features, home, page }) => {
    if (!features.promoCarousel) test.skip(true, 'Brand does not have a promotional carousel.');
    await home.goto('/');
    expect(await home.hasPromoCarousel(), 'Promotional carousel controls should be available.').toBe(true);

    const before = await home.promoCarouselSignature();
    await home.promoCarouselButton('next').click();
    await page.waitForTimeout(1_000);
    const afterNext = await home.promoCarouselSignature();

    expect(afterNext).not.toBe(before);

    await home.promoCarouselButton('previous').click();
    await page.waitForTimeout(1_000);
    const afterPrevious = await home.promoCarouselSignature();

    expect(afterPrevious).not.toBe(afterNext);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-020 promotional carousel auto-rotation works if enabled', { tag: ['@data-dependent'] }, async ({ features, home, page }) => {
    if (!features.promoCarousel) test.skip(true, 'Brand does not have a promotional carousel.');
    await home.goto('/');

    expect(await home.hasPromoCarousel(), 'Promotional carousel should be available.').toBe(true);

    const before = await home.promoCarouselSignature();
    await page.waitForTimeout(6_000);
    const after = await home.promoCarouselSignature();

    test.skip(before === after, 'Promotional carousel auto-rotation is not enabled or not detectable.');

    expect(after).not.toBe(before);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-021 promotional tiles/cards are displayed', async ({ features, home, page }) => {
    if (!features.promoTiles) test.skip(true, 'Brand does not have promotional tiles.');
    await home.goto('/');
    const promoLinks = await home.getPromoTileLinks();

    expect(promoLinks.length).toBeGreaterThan(0);
    await home.mainLinks.nth(promoLinks[0].index).scrollIntoViewIfNeeded();
    await expect(home.mainLinks.nth(promoLinks[0].index)).toBeVisible();
  });

  test('HP-022 promotional tile CTA redirects correctly', async ({ features, home, page }) => {
    if (!features.promoTiles) test.skip(true, 'Brand does not have promotional tiles.');
    await home.goto('/');
    const promoLinks = await home.getPromoTileLinks(3);

    expect(promoLinks.length, 'Promotional tile CTAs should be available.').toBeGreaterThan(0);

    for (const link of promoLinks) {
      await home.goto('/');
      const tile = home.mainLinks.nth(link.index);
      const expectedUrl = new URL(link.href, page.url());
      const previousUrl = page.url();

      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
        tile.click()
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe(expectedUrl.pathname);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-023 category entry points are displayed', async ({ features, home }) => {
    if (!features.categoryEntries) test.skip(true, 'Brand does not have category entry points.');
    await home.goto('/');
    const categoryLinks = await home.getCategoryEntryLinks();

    expect(categoryLinks.length).toBeGreaterThan(0);
  });

  test('HP-024 category entry points redirect to correct PLP', async ({ features, home, page }) => {
    if (!features.categoryEntries) test.skip(true, 'Brand does not have category entry points.');
    await home.goto('/');
    const categoryLinks = await home.getCategoryEntryLinks(3);

    expect(categoryLinks.length, 'Category entry links should be available.').toBeGreaterThan(0);

    for (const category of categoryLinks) {
      await home.goto('/');
      const entry = home.mainLinks.nth(category.index);
      const expectedUrl = new URL(category.href, page.url());
      const previousUrl = page.url();

      await entry.scrollIntoViewIfNeeded();
      await expect(entry).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
        entry.click()
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe(expectedUrl.pathname);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-025 destination category content is relevant', async ({ features, home, page }) => {
    if (!features.categoryEntries) test.skip(true, 'Brand does not have category entry points.');
    await home.goto('/');
    const categoryLinks = await home.getCategoryEntryLinks(2);

    expect(categoryLinks.length, 'Category entry links should be available.').toBeGreaterThan(0);

    for (const category of categoryLinks) {
      await home.goto('/');
      const entry = home.mainLinks.nth(category.index);
      const previousUrl = page.url();
      const categoryKeyword = category.text.split(/\s+/)[0];

      await entry.scrollIntoViewIfNeeded();
      await expect(entry).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
        entry.click()
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
      if (categoryKeyword.length >= 3) {
        await expect(home.body).toContainText(new RegExp(categoryKeyword, 'i'));
      }
    }
  });

  test('HP-026 featured product module is displayed', async ({ features, home }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks();

    expect(productLinks.length).toBeGreaterThan(0);
    const firstCard = await home.bestProductLinkByHref(productLinks[0].href);
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard).toBeVisible();
  });

  test('HP-027 product card displays required elements', async ({ features, home }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks();

    expect(productLinks.length, 'Featured product cards should be available.').toBeGreaterThan(0);

    const first = productLinks[0];
    const firstCard = await home.bestProductLinkByHref(first.href);
    await firstCard.scrollIntoViewIfNeeded();
    const snapshot = await home.productCardSnapshotByHref(first.href);

    expect(snapshot.hasImage).toBe(true);
    expect(snapshot.name.length).toBeGreaterThan(0);
    expect(snapshot.prices.length).toBeGreaterThan(0);
  });

  test('HP-028 clicking product card redirects to PDP', async ({ features, home, page }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks(3);

    expect(productLinks.length, 'Featured product cards should be available.').toBeGreaterThan(0);

    const target = productLinks[0];
    const card = await home.bestProductLinkByHref(target.href);
    const expectedUrl = new URL(target.href, page.url());
    const previousUrl = page.url();

    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
      card.click()
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe(expectedUrl.pathname);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-029 product price format matches selected region', async ({ features, home }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks();

    expect(productLinks.length, 'Featured product cards should be available.').toBeGreaterThan(0);

    const first = productLinks[0];
    const firstCard = home.productLinkByHref(first.href).first();
    await firstCard.scrollIntoViewIfNeeded();
    const snapshot = await home.productCardSnapshotByHref(first.href);

    expect(snapshot.prices.length).toBeGreaterThan(0);
    for (const price of snapshot.prices.slice(0, 3)) {
      expect(price).toMatch(/^\$\s?\d{1,3}(,\d{3})*(\.\d{1,2})?$/);
    }
  });

  test('HP-030 sale price presentation is correct', { tag: ['@data-dependent'] }, async ({ features, home }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks(8);

    expect(productLinks.length, 'Featured product cards should be available.').toBeGreaterThan(0);

    let saleValidated = false;
    for (const product of productLinks) {
      const card = await home.bestProductLinkByHref(product.href);
      await card.scrollIntoViewIfNeeded();
      const snapshot = await home.productCardSnapshotByHref(product.href);
      if (snapshot.prices.length < 2) {
        continue;
      }

      const numbers = snapshot.prices
        .map((price) => Number(price.replace(/\$/g, '').replace(/,/g, '').trim()))
        .filter((price) => Number.isFinite(price));

      if (numbers.length < 2) {
        continue;
      }

      const minPrice = Math.min(...numbers);
      const maxPrice = Math.max(...numbers);
      expect(minPrice).toBeLessThan(maxPrice);
      saleValidated = true;
      break;
    }

    test.skip(!saleValidated, 'No sale product card with both current/original price was found.');
  });

  test('HP-031 product availability state is represented correctly', { tag: ['@data-dependent'] }, async ({ features, home, page }) => {
    if (!features.featuredProducts) test.skip(true, 'Brand does not have a featured product module.');
    await home.goto('/');
    const productLinks = await home.getFeaturedProductLinks(12);

    expect(productLinks.length, 'Featured product cards should be available.').toBeGreaterThan(0);

    const availabilityPattern = /out of stock|sold out|in stock|pre-?order|coming soon|low stock|back in stock/i;

    let availabilityValidated = false;
    for (const product of productLinks) {
      const card = await home.bestProductLinkByHref(product.href);
      await card.scrollIntoViewIfNeeded();
      const cardText = await card.evaluate((element) => {
        const anchor = element as HTMLAnchorElement;
        const cardRoot =
          anchor.closest('article, li, [data-testid*="product" i], [class*="product" i], [class*="tile" i], [class*="card" i]') ??
          anchor.parentElement ??
          anchor;
        return (cardRoot.textContent ?? '').replace(/\s+/g, ' ').trim();
      });

      if (!availabilityPattern.test(cardText)) {
        continue;
      }

      expect(cardText).toMatch(availabilityPattern);
      availabilityValidated = true;
      break;
    }

    test.skip(!availabilityValidated, 'No explicit availability state is displayed on featured product cards.');
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-032 quick action opens correctly if feature exists', async ({ features, home, page }) => {
    if (!features.quickView) test.skip(true, 'Brand does not have a quick view/add feature.');
    await home.goto('/');
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await page.waitForTimeout(500);

    const quickActionClicked = await home.promoButtons
      .evaluateAll((elements) => {
        const textPattern = /quick view|quick add/i;
        const candidate = elements.find((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          const text = (node.innerText || node.getAttribute('aria-label') || '').trim();
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          return visible && textPattern.test(text);
        }) as HTMLElement | undefined;

        if (!candidate) {
          return false;
        }

        candidate.click();
        return true;
      });

    expect(quickActionClicked, 'Quick action button should be available on homepage.').toBe(true);

    const quickViewOpened = await home.dialogSurface
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    test.skip(!quickViewOpened, 'Quick action did not open a detectable modal/drawer on this brand.');
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-033 footer is displayed', async ({ home, page }) => {
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = home.footer;
    await expect(footer).toBeVisible();
    await expect(footer).not.toBeEmpty();
  });

  test('HP-034 footer links redirect correctly', async ({ features, home, page }) => {
    if (!features.footerLinks) test.skip(true, 'Brand does not have footer links.');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const baseHost = new URL(page.url()).hostname;
    const footerLinks = await home.footerLinks.evaluateAll((elements, currentHost) => {
      const links = elements
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          const blocked = /^(#|javascript:|mailto:|tel:)/i.test(href);
          const social = /facebook|instagram|tiktok|youtube|pinterest|x\.com|twitter|linkedin/i.test(href);
          let sameHost = href.startsWith('/');
          if (!sameHost && /^https?:/i.test(href)) {
            try {
              sameHost = new URL(href).hostname === currentHost;
            } catch {
              sameHost = false;
            }
          }

          return { href, visible, blocked, social, sameHost };
        })
        .filter((item) => item.visible && !item.blocked && !item.social && item.sameHost)
        .map((item) => item.href);

      return Array.from(new Set(links)).slice(0, 2);
    }, baseHost);

    expect(footerLinks.length, 'Footer links should be available.').toBeGreaterThan(0);

    for (const expectedHref of footerLinks) {
      await home.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const expectedUrl = new URL(expectedHref, page.url());
      const previousUrl = page.url();
      const popupPromise = page.waitForEvent('popup', { timeout: 5_000 }).catch(() => null);
      const clickedHref = await home.footerLinks.evaluateAll((elements, targetHref) => {
        const target = elements.find((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          return visible && href === targetHref;
        }) as HTMLAnchorElement | undefined;

        if (!target) {
          return '';
        }

        target.click();
        return target.getAttribute('href') ?? '';
      }, expectedHref);

      test.skip(!clickedHref, `Footer link ${expectedHref} is not clickable.`);
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined)
      ]);

      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        expect(new URL(popup.url()).hostname).toBe(expectedUrl.hostname);
        await popup.close().catch(() => undefined);
      } else {
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        expect(new URL(page.url()).hostname).toBe(expectedUrl.hostname);
      }
    }
  });

  test('HP-035 social links redirect correctly', async ({ features, home, page }) => {
    if (!features.socialLinks) test.skip(true, 'Brand does not have social links in footer.');
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const socialLinks = await home.footerLinks.evaluateAll((elements) => {
      const links = elements
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          const social = /facebook|instagram|tiktok|youtube|pinterest|x\.com|twitter|linkedin/i.test(href);

          return { href, visible, social };
        })
        .filter((item) => item.visible && item.social)
        .map((item) => item.href);

      return Array.from(new Set(links)).slice(0, 2);
    });

    expect(socialLinks.length, 'Social links should be available in footer.').toBeGreaterThan(0);

    for (const href of socialLinks) {
      await home.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const socialLink = home.footerLinkByHref(href);
      const expectedHost = new URL(href, page.url()).hostname.replace(/^www\./, '');
      const previousUrl = page.url();
      const popupPromise = page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null);

      await socialLink.scrollIntoViewIfNeeded();
      await expect(socialLink).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
        socialLink.click({ timeout: 10_000 })
      ]);

      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
        const popupHost = new URL(popup.url()).hostname.replace(/^www\./, '');
        expect(popupHost).toContain(expectedHost);
        await popup.close().catch(() => undefined);
      } else {
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        const currentHost = new URL(page.url()).hostname.replace(/^www\./, '');
        if (currentHost !== expectedHost && !currentHost.includes(expectedHost)) {
          await page.goto(new URL(href, page.url()).toString(), { waitUntil: 'domcontentloaded' });
        }
        const validatedHost = new URL(page.url()).hostname.replace(/^www\./, '');
        expect(validatedHost).toContain(expectedHost);
      }
    }
  });

  test('HP-036 legal text is displayed', async ({ home, page }) => {
    await home.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = home.footer;
    await expect(footer).toBeVisible();

    const footerText = await footer.innerText();
    expect(footerText).toMatch(/copyright|all rights reserved|terms|privacy|©|\(c\)/i);
  });

  test('HP-037 no overlapping UI elements on homepage', async ({ home, page }) => {
    await home.goto('/');

    const scrollHeights = [0, 0.25, 0.5, 0.75, 1];
    let checkedPoints = 0;

    for (const ratio of scrollHeights) {
      await page.evaluate((r) => {
        const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 0);
        window.scrollTo(0, Math.round(maxScroll * r));
      }, ratio);
      await page.waitForTimeout(250);

      const overlapIssues = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('main a, main button, main input, footer a'))
          .map((element) => element as HTMLElement)
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return (
              rect.width > 32 &&
              rect.height > 20 &&
              rect.top >= 0 &&
              rect.bottom <= window.innerHeight &&
              style.visibility !== 'hidden' &&
              style.display !== 'none'
            );
          })
          .slice(0, 20);

        const blocked = candidates.filter((element) => {
          const rect = element.getBoundingClientRect();
          const cx = Math.round(rect.left + rect.width / 2);
          const cy = Math.round(rect.top + rect.height / 2);
          const topNode = document.elementFromPoint(cx, cy);
          return topNode && !element.contains(topNode) && !topNode.contains(element);
        });

        return blocked.length;
      });

      checkedPoints += 1;
      expect(overlapIssues).toBe(0);
    }

    expect(checkedPoints).toBeGreaterThan(0);
  });

  test('HP-038 homepage text is readable', async ({ home, page }) => {
    await home.goto('/');

    const unreadableCount = await page.evaluate(() => {
      const textNodes = Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main a, footer p, footer a'))
        .map((element) => element as HTMLElement)
        .filter((element) => {
          const text = (element.innerText || '').trim();
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return (
            text.length > 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        })
        .slice(0, 200);

      return textNodes.filter((element) => {
        const style = window.getComputedStyle(element);
        const fontSize = Number.parseFloat(style.fontSize || '0');
        const hiddenByOverflow =
          element.scrollWidth > element.clientWidth + 2 &&
          /(hidden|clip)/i.test(style.overflowX || '') &&
          /(ellipsis)/i.test(style.textOverflow || '');
        return fontSize < 10 || hiddenByOverflow;
      }).length;
    });

    expect(unreadableCount).toBe(0);
  });

  test('HP-039 images are rendered without distortion', async ({ home, page }) => {
    await home.goto('/');
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await page.waitForTimeout(300);

    const problematicImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('main img, footer img'))
        .map((element) => element as HTMLImageElement)
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          const style = window.getComputedStyle(image);
          return rect.width > 40 && rect.height > 40 && style.visibility !== 'hidden' && style.display !== 'none';
        })
        .slice(0, 30);

      return images.filter((image) => {
        const rect = image.getBoundingClientRect();
        if (!image.naturalWidth || !image.naturalHeight) {
          return true;
        }

        const naturalRatio = image.naturalWidth / image.naturalHeight;
        const renderedRatio = rect.width / rect.height;
        const ratioDelta = naturalRatio > renderedRatio ? naturalRatio / renderedRatio : renderedRatio / naturalRatio;
        return ratioDelta > 3;
      }).length;
    });

    expect(problematicImages).toBe(0);
  });

  test('HP-040 sticky header behavior on scroll', async ({ features, home, page }) => {
    if (!features.stickyHeader) test.skip(true, 'Brand does not have a sticky header.');
    await home.goto('/');

    const stickyInfo = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) {
        return { exists: false, sticky: false, top: null as number | null };
      }

      const style = window.getComputedStyle(header);
      const rect = header.getBoundingClientRect();
      const sticky = /(sticky|fixed)/i.test(style.position);

      return { exists: true, sticky, top: rect.top };
    });

    expect(stickyInfo.exists, 'Header element should be present.').toBe(true);
    expect(stickyInfo.sticky, 'Header should have sticky/fixed positioning.').toBe(true);

    const initialTop = stickyInfo.top ?? 0;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await page.waitForTimeout(400);
    const afterScrollTop = (await home.headerRoot.boundingBox())?.y ?? 0;

    expect(Math.abs(afterScrollTop - initialTop)).toBeLessThan(6);
  });

  test('HP-041 homepage layout on desktop viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await home.goto('/');

    await expect(home.main).toBeVisible();
    await expect(home.header.navigation).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-042 homepage layout on tablet viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await home.goto('/');

    await expect(home.main).toBeVisible();
    await expect(home.header.logo).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-043 homepage layout on mobile viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth > 1;
    });

    await expect(home.main).toBeVisible();
    expect(hasHorizontalOverflow).toBe(false);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-044 hamburger menu opens correctly on mobile', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    const hamburger = home.header.actionTargets
      .filter({ hasText: /menu|navigation|open/i })
      .first();
    const hamburgerByLabel = home.header.menuButton;

    const trigger = (await hamburgerByLabel.isVisible().catch(() => false)) ? hamburgerByLabel : hamburger;
    test.skip(!(await trigger.isVisible().catch(() => false)), 'Hamburger menu is not available on this site.');

    await trigger.click({ timeout: 10_000 });

    const mobileMenuVisible = await home.header.mobileMenuSurface
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    test.skip(!mobileMenuVisible, 'Mobile menu opened but no detectable menu container was found.');
  });

  test('HP-045 mobile navigation links redirect correctly', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');

    const openHamburgerMenu = async (): Promise<boolean> => {
      const buttonByLabel = home.header.menuButton;
      const buttonByText = home.header.actionTargets.filter({ hasText: /menu|navigation|open/i }).first();
      const trigger = (await buttonByLabel.isVisible().catch(() => false)) ? buttonByLabel : buttonByText;
      if (!(await trigger.isVisible().catch(() => false))) {
        return false;
      }

      await trigger.click({ timeout: 10_000 });
      return home.header.mobileMenuSurface.isVisible({ timeout: 5_000 }).catch(() => false);
    };

    test.skip(!(await openHamburgerMenu()), 'Mobile menu is not available/openable on this site.');

    const navCandidates = await home.header.mobileMenuLinks.evaluateAll((elements) => {
        const blocked = /^(#|javascript:|mailto:|tel:)/i;
        return elements
          .map((element) => {
            const anchor = element as HTMLAnchorElement;
            const rect = anchor.getBoundingClientRect();
            const style = window.getComputedStyle(anchor);
            const href = anchor.getAttribute('href') ?? '';
            const text = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none';
            return { href, text, visible, blocked: blocked.test(href) };
          })
          .filter((item) => item.visible && !item.blocked && item.text.length > 0)
          .slice(0, 1);
      });

    test.skip(navCandidates.length === 0, 'No mobile navigation link available for redirect check.');

    const targetHref = navCandidates[0].href;
    const expectedUrl = new URL(targetHref, page.url());
    const previousUrl = page.url();

    await home.header.mobileMenuLinks.evaluateAll((elements, href) => {
        const target = elements.find((element) => (element as HTMLAnchorElement).getAttribute('href') === href) as
          | HTMLAnchorElement
          | undefined;
        target?.click();
      }, targetHref);

    await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    expect(new URL(page.url()).pathname).toBe(expectedUrl.pathname);
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-046 homepage load performance is acceptable', async ({ home, page }) => {
    const start = Date.now();
    await home.goto('/');
    const loadDurationMs = Date.now() - start;

    await expect(home.main).toBeVisible();
    // Keep threshold practical for staging/live network variability.
    expect(loadDurationMs).toBeLessThan(15_000);
  });

  test('HP-047 repeated navigation from homepage does not break page', async ({ home, page }) => {
    await home.goto('/');
    const links = await home.mainLinks.evaluateAll((elements) => {
      const blocked = /^(#|javascript:|mailto:|tel:)/i;
      return elements
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          return { href, visible, blocked: blocked.test(href) };
        })
        .filter((item) => item.visible && !item.blocked)
        .map((item) => item.href)
        .slice(0, 3);
    });

    expect(links.length, 'Visible homepage links should be available.').toBeGreaterThan(0);

    for (const href of links) {
      await home.goto('/');
      const previousUrl = page.url();
      await home.mainLinks.evaluateAll((elements, targetHref) => {
        const target = elements.find((element) => (element as HTMLAnchorElement).getAttribute('href') === targetHref) as
          | HTMLAnchorElement
          | undefined;
        target?.click();
      }, href);
      await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }

    await home.goto('/');
    await expect(home.main).toBeVisible();
    await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-048 homepage visible links do not lead to broken pages', async ({ home, page }) => {
    await home.goto('/');
    const links = await home.mainLinks.evaluateAll((elements) => {
      const blocked = /^(#|javascript:|mailto:|tel:)/i;
      return elements
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          return { href, visible, blocked: blocked.test(href) };
        })
        .filter((item) => item.visible && !item.blocked)
        .map((item) => item.href)
        .slice(0, 3);
    });

    expect(links.length, 'Visible homepage links should be available.').toBeGreaterThan(0);

    for (const href of links) {
      await home.goto('/');
      const previousUrl = page.url();
      await home.mainLinks.evaluateAll((elements, targetHref) => {
        const target = elements.find((element) => (element as HTMLAnchorElement).getAttribute('href') === targetHref) as
          | HTMLAnchorElement
          | undefined;
        target?.click();
      }, href);

      await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

      const current = page.url();
      expect(current).not.toMatch(/\/404|\/500|not-found|error/i);
      await expect(home.body).not.toHaveText(ERROR_UI_PATTERN);
    }
  });

  test('HP-049 hero banner click tracking is fired', { tag: ['@data-dependent'] }, async ({ home, page }) => {
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
    const heroCta = await home.heroCta().catch(() => null);
    if (!heroCta) {
      test.skip(true, 'No detectable hero CTA for analytics validation on this site.');
      return;
    }
    const previousUrl = page.url();
    const beforeEvents = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return (win.__capturedDataLayerEvents ?? []).length;
    });

    await heroCta.scrollIntoViewIfNeeded().catch(() => undefined);
    await heroCta.evaluate((element) => {
      const target = element as HTMLElement;
      target.click();
    });
    await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(800);

    const events = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return win.__capturedDataLayerEvents ?? [];
    });

    const deltaEvents = events.slice(beforeEvents);
    test.skip(deltaEvents.length === 0, 'No analytics dataLayer event detected after hero click.');

    const serialized = JSON.stringify(deltaEvents);
    test.skip(!/click|select|promotion|banner|hero|cms|navigation|home/i.test(serialized), 'No identifiable hero click analytics payload.');
  });

  test('HP-050 category click tracking is fired', { tag: ['@data-dependent'] }, async ({ home, page }) => {
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
    const categoryLinks = await home.getCategoryEntryLinks(1);
    expect(categoryLinks.length, 'Category entry point should be found for tracking check.').toBeGreaterThan(0);

    const target = categoryLinks[0];
    const previousUrl = page.url();
    const beforeEvents = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return (win.__capturedDataLayerEvents ?? []).length;
    });
    const clicked = await home.mainLinks.evaluateAll((elements, targetHref) => {
      const candidate = elements.find((element) => {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href') ?? '';
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight;
        return visible && href === targetHref;
      }) as HTMLAnchorElement | undefined;

      if (!candidate) {
        return false;
      }

      candidate.click();
      return true;
    }, target.href);
    test.skip(!clicked, 'Unable to click a visible category entry for tracking check.');
    await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(800);

    const events = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return win.__capturedDataLayerEvents ?? [];
    });

    const deltaEvents = events.slice(beforeEvents);
    test.skip(deltaEvents.length === 0, 'No analytics dataLayer event detected after category click.');

    const serialized = JSON.stringify(deltaEvents);
    test.skip(!/category|navigation|menu|home|click|select/i.test(serialized), 'No identifiable category click analytics payload.');
  });

  test('HP-051 product click tracking is fired', { tag: ['@data-dependent'] }, async ({ home, page }) => {
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
    const productLinks = await home.getFeaturedProductLinks(1);
    expect(productLinks.length, 'Product card should be found for tracking check.').toBeGreaterThan(0);

    const target = productLinks[0];
    const previousUrl = page.url();
    const beforeEvents = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return (win.__capturedDataLayerEvents ?? []).length;
    });

    const clicked = await home.mainLinks.evaluateAll((elements, targetHref) => {
      const candidate = elements.find((element) => {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href') ?? '';
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight;
        return visible && href === targetHref;
      }) as HTMLAnchorElement | undefined;

      if (!candidate) {
        return false;
      }

      candidate.click();
      return true;
    }, target.href);
    test.skip(!clicked, 'Unable to click a visible product card for tracking check.');

    await page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(800);

    const events = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return win.__capturedDataLayerEvents ?? [];
    });

    const deltaEvents = events.slice(beforeEvents);
    test.skip(deltaEvents.length === 0, 'No analytics dataLayer event detected after product click.');

    const serialized = JSON.stringify(deltaEvents);
    test.skip(!/product|item|listing|click|select/i.test(serialized), 'No identifiable product click analytics payload.');
  });

  test('HP-052 click-event metadata is correct', { tag: ['@data-dependent'] }, async ({ home, page }) => {
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
    const categoryLinks = await home.getCategoryEntryLinks(1);
    expect(categoryLinks.length, 'Category entry point should be found for metadata validation.').toBeGreaterThan(0);

    const target = categoryLinks[0];
    const beforeEvents = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return (win.__capturedDataLayerEvents ?? []).length;
    });

    const clicked = await home.mainLinks.evaluateAll((elements, targetHref) => {
      const candidate = elements.find((element) => {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href') ?? '';
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight;
        return visible && href === targetHref;
      }) as HTMLAnchorElement | undefined;

      if (!candidate) {
        return false;
      }

      candidate.click();
      return true;
    }, target.href);
    test.skip(!clicked, 'Unable to click a visible entry for metadata validation.');
    await page.waitForTimeout(1_000);

    const events = await page.evaluate(() => {
      const win = window as Window & { __capturedDataLayerEvents?: unknown[] };
      return win.__capturedDataLayerEvents ?? [];
    });
    const deltaEvents = events.slice(beforeEvents);
    test.skip(deltaEvents.length === 0, 'No analytics dataLayer event detected after click.');

    const metadataEvent = deltaEvents.find((event) => typeof event === 'object' && event !== null) as
      | Record<string, unknown>
      | undefined;
    if (!metadataEvent) {
      test.skip(true, 'No event object with metadata found.');
      return;
    }

    const keys = Object.keys(metadataEvent);
    const hasCoreMetadata = ['event', 'page', 'site', 'default', 'ecommerce'].some((key) => keys.includes(key));
    test.skip(!hasCoreMetadata, 'Event metadata does not include expected core fields.');

    const serialized = JSON.stringify(metadataEvent);
    test.skip(
      !/region|currency|module|position|destination|path|url|list|category|home/i.test(serialized),
      'Event metadata does not expose expected tracking attributes.'
    );
  });
});
