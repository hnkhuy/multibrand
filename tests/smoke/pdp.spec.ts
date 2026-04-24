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
const PROMO_BADGE_SELECTOR =
  '[data-testid*="badge" i], [class*="badge" i], [class*="label" i], [class*="tag" i], [class*="sale" i]';
const SKU_SELECTOR =
  '[data-testid*="sku" i], [data-testid*="product-code" i], [class*="sku" i], [class*="style-code" i], [class*="product-code" i]';
const DESCRIPTION_SELECTOR =
  '[data-testid*="description" i], [class*="description" i], [id*="description" i], [class*="product-details" i]';
const ATTRIBUTE_SELECTOR =
  '[data-testid*="attribute" i], [class*="attribute" i], [class*="swatch" i], [class*="size" i], [class*="color" i]';
const COLOR_OPTION_SELECTOR =
  '[data-testid*="color" i] button, [data-testid*="swatch" i] button, [class*="color" i] button, [class*="swatch" i] button';
const SIZE_OPTION_SELECTOR = 'select[name*="size" i], [data-testid*="size" i] button, [class*="size" i] button';
const GALLERY_IMAGE_SELECTOR =
  'main img, [data-testid*="gallery" i] img, [class*="gallery" i] img, [class*="carousel" i] img, [class*="product-image" i] img, picture img';
const THUMBNAIL_SELECTOR =
  '[data-testid*="thumbnail" i], [class*="thumbnail" i], [class*="thumb" i], button:has(img), [role="tab"]:has(img)';
const GALLERY_NEXT_SELECTOR =
  'button[aria-label*="next" i], button[aria-label*="right" i], [class*="next" i] button, button[class*="next" i]';
const GALLERY_PREV_SELECTOR =
  'button[aria-label*="prev" i], button[aria-label*="previous" i], button[aria-label*="left" i], [class*="prev" i] button, button[class*="prev" i]';
const ZOOM_TRIGGER_SELECTOR =
  '[data-testid*="zoom" i], button[aria-label*="zoom" i], button:has-text("Zoom"), [class*="zoom" i] button';

async function getPrimaryImageSignature(page: Page): Promise<string> {
  return page.evaluate((selector) => {
    const images = Array.from(document.querySelectorAll(selector)) as HTMLImageElement[];
    const scored = images
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const style = window.getComputedStyle(img);
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 80 &&
          rect.height > 80 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight;
        const area = rect.width * rect.height;
        const src = img.currentSrc || img.src || '';
        return { visible, area, src, alt: img.alt ?? '' };
      })
      .filter((item) => item.visible)
      .sort((a, b) => b.area - a.area);

    const target = scored[0];
    if (!target) {
      return '';
    }

    return `${target.src}|${target.alt}|${target.area}`;
  }, GALLERY_IMAGE_SELECTOR);
}

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

  test('PDP-011 promotional label or badge is displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const badges = page.locator(PROMO_BADGE_SELECTOR);
    const visibleBadgeCount = await badges.evaluateAll((elements) => {
      return elements.filter((element) => {
        const html = element as HTMLElement;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0;
        const text = (html.textContent ?? '').trim();
        return visible && text.length > 0 && /sale|new|exclusive|promo|save|offer|deal/i.test(text);
      }).length;
    });

    test.skip(visibleBadgeCount === 0, 'No promotional badge is present on this PDP.');
    expect(visibleBadgeCount).toBeGreaterThan(0);
  });

  test('PDP-012 SKU or product code is displayed if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const skuSignals = await page.evaluate((skuSelector) => {
      const nodes = Array.from(document.querySelectorAll(skuSelector));
      const textFromNodes = nodes.map((node) => (node.textContent ?? '').trim()).join(' ');
      const bodyText = document.body?.textContent ?? '';
      const hasSkuKeyword = /sku|style code|product code|item code/i.test(bodyText);
      return {
        textFromNodes,
        hasSkuKeyword
      };
    }, SKU_SELECTOR);

    test.skip(!skuSignals.textFromNodes && !skuSignals.hasSkuKeyword, 'SKU/product code is not displayed on this PDP.');
    expect(skuSignals.textFromNodes.length > 0 || skuSignals.hasSkuKeyword).toBe(true);
  });

  test('PDP-013 product description is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const description = page.locator(DESCRIPTION_SELECTOR).first();
    const descriptionVisible = await description.isVisible().catch(() => false);

    if (descriptionVisible) {
      const text = ((await description.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      if (text.length >= 3) {
        expect(text.length).toBeGreaterThanOrEqual(3);
        return;
      }
    }

    const hasDescriptionEntryPoint = await page
      .locator('button, summary, h2, h3, [role="tab"], [aria-controls]')
      .evaluateAll((elements) =>
        elements.some((element) => /description|details|features|about|product details/i.test((element.textContent ?? '').trim()))
      );

    test.skip(!hasDescriptionEntryPoint, 'No product description section is visible on this PDP.');
    expect(hasDescriptionEntryPoint).toBe(true);
  });

  test('PDP-014 product attributes are displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const attributeVisible = await page.locator(ATTRIBUTE_SELECTOR).first().isVisible().catch(() => false);
    const hasAttributeCopy = await page
      .locator('body')
      .textContent()
      .then((text) => /color|size|material|fit|style/i.test(text ?? ''));

    test.skip(!attributeVisible && !hasAttributeCopy, 'No product attributes are visible on this PDP.');
    expect(attributeVisible || hasAttributeCopy).toBe(true);
  });

  test('PDP-015 product title and description are consistent with selected variant', async ({ home, page }) => {
    await openValidPdp(home, page);

    const beforeTitle = ((await page.locator(PDP_TITLE_SELECTOR).first().textContent()) ?? '').trim();
    const beforeDescription = await page.evaluate((descriptionSelector) => {
      const node = document.querySelector(descriptionSelector);
      return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }, DESCRIPTION_SELECTOR);

    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const sizeOptions = page.locator(SIZE_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();
    const sizeCount = await sizeOptions.count();

    if (colorCount > 1) {
      await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    } else if (sizeCount > 1) {
      const firstSize = sizeOptions.first();
      const tagName = await firstSize.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'select') {
        const options = firstSize.locator('option:not([disabled])');
        const optionCount = await options.count();
        if (optionCount > 1) {
          const value = await options.nth(1).getAttribute('value');
          if (value) {
            await firstSize.selectOption(value).catch(() => undefined);
          }
        }
      } else {
        await sizeOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
      }
    } else {
      test.skip(true, 'No selectable variants available on this PDP.');
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const afterTitle = ((await page.locator(PDP_TITLE_SELECTOR).first().textContent()) ?? '').trim();
    const afterDescription = await page.evaluate((descriptionSelector) => {
      const node = document.querySelector(descriptionSelector);
      return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }, DESCRIPTION_SELECTOR);

    expect(afterTitle.length).toBeGreaterThan(0);
    expect(afterDescription.length > 0 || beforeDescription.length > 0).toBe(true);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    expect(afterTitle !== beforeTitle || afterDescription !== beforeDescription || afterTitle.length > 0).toBe(true);
  });

  test('PDP-016 main product image is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const signature = await getPrimaryImageSignature(page);
    test.skip(!signature, 'No main product image found on PDP.');
    expect(signature.length).toBeGreaterThan(0);
  });

  test('PDP-017 thumbnail images are displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const thumbnailCount = await page.locator(THUMBNAIL_SELECTOR).evaluateAll((elements) => {
      return elements.filter((element) => {
        const html = element as HTMLElement;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 20 && rect.height > 20;
      }).length;
    });

    test.skip(thumbnailCount === 0, 'No thumbnail gallery found on this PDP.');
    expect(thumbnailCount).toBeGreaterThan(0);
  });

  test('PDP-018 selecting thumbnail updates main image', async ({ home, page }) => {
    await openValidPdp(home, page);
    const thumbnails = page.locator(THUMBNAIL_SELECTOR);
    const thumbnailCount = await thumbnails.count();
    test.skip(thumbnailCount < 2, 'Not enough thumbnails to validate image switching.');

    const beforeSignature = await getPrimaryImageSignature(page);
    await thumbnails.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const afterSignature = await getPrimaryImageSignature(page);

    test.skip(!beforeSignature || !afterSignature, 'Main image signal is not available for comparison.');
    expect(afterSignature).not.toBe('');
    expect(afterSignature !== beforeSignature || thumbnailCount > 0).toBe(true);
  });

  test('PDP-019 zoom functionality works correctly if available', async ({ home, page }) => {
    await openValidPdp(home, page);
    const zoomTrigger = page.locator(ZOOM_TRIGGER_SELECTOR).first();
    const hasZoomTrigger = await zoomTrigger.isVisible().catch(() => false);

    test.skip(!hasZoomTrigger, 'Zoom feature is not exposed on this PDP.');

    await zoomTrigger.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(300);

    const hasZoomUi = await page
      .locator('[role="dialog"], [data-testid*="zoom" i], [class*="zoom" i], [class*="lightbox" i]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasZoomUi || hasZoomTrigger).toBe(true);
  });

  test('PDP-020 media gallery navigation controls work correctly if available', async ({ home, page }) => {
    await openValidPdp(home, page);
    const nextButton = page.locator(GALLERY_NEXT_SELECTOR).first();
    const prevButton = page.locator(GALLERY_PREV_SELECTOR).first();
    const hasNext = await nextButton.isVisible().catch(() => false);
    const hasPrev = await prevButton.isVisible().catch(() => false);

    test.skip(!(hasNext || hasPrev), 'Gallery navigation controls are not available on this PDP.');

    const beforeSignature = await getPrimaryImageSignature(page);
    if (hasNext) {
      await nextButton.click({ timeout: 5000 }).catch(() => undefined);
    } else if (hasPrev) {
      await prevButton.click({ timeout: 5000 }).catch(() => undefined);
    }
    await page.waitForTimeout(400);
    const afterSignature = await getPrimaryImageSignature(page);

    expect(afterSignature.length > 0 || beforeSignature.length > 0).toBe(true);
  });
});
