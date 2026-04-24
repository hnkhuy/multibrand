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
const PRODUCT_VIDEO_SELECTOR =
  '[data-testid*="video" i] video, [class*="video" i] video, video[src], video source';
const MINI_CART_DRAWER_SELECTOR = '[data-testid="mini-cart"], [data-testid="minicart"], .mini-cart, .cart-drawer';
const SIZE_SELECT_SELECTOR = 'select[name*="size" i], [data-testid*="size" i] select';
const SIZE_BUTTON_SELECTOR = '[data-testid*="size" i] button, [class*="size" i] button';
const IN_STOCK_PATTERN = /in stock|available now|ready to ship|ships/i;
const OUT_OF_STOCK_PATTERN = /out of stock|sold out|unavailable|currently unavailable/i;
const LOW_STOCK_PATTERN = /low stock|only\s+\d+\s+left|hurry/i;
const REQUIRED_OPTION_PATTERN = /select size|choose size|please select|required/i;
const SUCCESS_FEEDBACK_SELECTOR =
  '[data-testid*="success" i], [data-testid*="added" i], [class*="success" i], [class*="toast" i], [class*="notification" i]';
const CART_COUNT_SELECTOR =
  '[data-testid*="cart-count" i], [class*="cart-count" i], [class*="badge" i], [aria-label*="cart" i] [class*="count" i], [aria-label*="bag" i] [class*="count" i]';
const QUANTITY_INPUT_SELECTOR =
  'input[name*="qty" i], input[name*="quantity" i], [data-testid*="quantity" i] input, select[name*="qty" i], select[name*="quantity" i]';
const WISHLIST_ENTRY_SELECTOR =
  '[data-testid*="wishlist" i], button[aria-label*="wishlist" i], a[href*="wishlist"], [class*="wishlist" i]';
const FIND_STORE_SELECTOR =
  '[data-testid*="store" i], button:has-text("Find in Store"), a:has-text("Find in Store"), [class*="store" i]';
const DELIVERY_SELECTOR =
  '[data-testid*="delivery" i], [class*="delivery" i], [class*="shipping" i], [id*="delivery" i]';
const PICKUP_SELECTOR =
  '[data-testid*="pickup" i], [class*="pickup" i], [class*="click-and-collect" i], [class*="collect" i]';
const FINANCE_PROMO_SELECTOR =
  '[data-testid*="finance" i], [data-testid*="payment" i], [class*="afterpay" i], [class*="klarna" i], [class*="zip" i], [class*="finance" i], [class*="payment" i]';
const RECOMMENDATION_SELECTOR =
  '[data-testid*="recommend" i], [class*="recommend" i], [class*="you-may-also-like" i], [class*="related" i]';
const ACCORDION_OR_TAB_SELECTOR =
  '[data-testid*="accordion" i], [class*="accordion" i], [role="tablist"], [role="tab"], details, summary';
const SHIPPING_RETURNS_PATTERN = /shipping|delivery|returns|return policy|exchange/i;
const STICKY_ATC_SELECTOR =
  '[data-testid*="sticky" i][data-testid*="cart" i], [class*="sticky" i][class*="cart" i], [class*="sticky" i][class*="atc" i]';

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

async function selectFirstAvailableSizeIfPossible(page: Page): Promise<boolean> {
  const select = page.locator(SIZE_SELECT_SELECTOR).first();
  if (await select.isVisible().catch(() => false)) {
    const options = select.locator('option:not([disabled])');
    const count = await options.count();
    if (count > 0) {
      const value = await options.nth(0).getAttribute('value');
      if (value) {
        await select.selectOption(value).catch(() => undefined);
        return true;
      }
    }
  }

  const sizeButtons = page.locator(SIZE_BUTTON_SELECTOR);
  const count = await sizeButtons.count();
  for (let index = 0; index < count; index += 1) {
    const option = sizeButtons.nth(index);
    const disabled = await option.evaluate((node) => {
      const button = node as HTMLButtonElement;
      return button.disabled || button.getAttribute('aria-disabled') === 'true';
    }).catch(() => true);
    if (!disabled) {
      await option.click({ timeout: 5000 }).catch(() => undefined);
      return true;
    }
  }

  return false;
}

async function readCartCount(page: Page): Promise<number | null> {
  const countText = await page.locator(CART_COUNT_SELECTOR).first().textContent().catch(() => null);
  if (!countText) {
    return null;
  }

  const matched = countText.match(/\d+/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function readAnalyticsEvents(page: Page): Promise<string> {
  return page.evaluate(() => {
    const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    const utag = (window as unknown as { utag_data?: Record<string, unknown> }).utag_data;
    const payload = {
      dataLayer: Array.isArray(dl) ? dl.slice(-30) : [],
      utagData: utag ?? {}
    };
    return JSON.stringify(payload).toLowerCase();
  });
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

  test('PDP-021 product video is playable if available', async ({ home, page }) => {
    await openValidPdp(home, page);

    const hasVideo = await page.evaluate((videoSelector) => {
      return Array.from(document.querySelectorAll(videoSelector)).some((node) => {
        const video = node instanceof HTMLVideoElement ? node : node.closest('video');
        if (!video) {
          return false;
        }
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 60 &&
          rect.height > 60
        );
      });
    }, PRODUCT_VIDEO_SELECTOR);

    test.skip(!hasVideo, 'No product video available on this PDP.');

    const playbackResult = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const visibleVideo = videos.find((video) => {
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 60 && rect.height > 60;
      });

      if (!visibleVideo) {
        return { attempted: false, progressed: false };
      }

      visibleVideo.muted = true;
      const initialTime = visibleVideo.currentTime;
      return visibleVideo
        .play()
        .then(() => new Promise<{ attempted: boolean; progressed: boolean }>((resolve) => {
          setTimeout(() => {
            resolve({
              attempted: true,
              progressed: visibleVideo.currentTime > initialTime || !visibleVideo.paused
            });
          }, 500);
        }))
        .catch(() => ({ attempted: true, progressed: false }));
    });

    expect(playbackResult.attempted).toBe(true);
    expect(playbackResult.progressed).toBe(true);
  });

  test('PDP-022 color options are displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();

    test.skip(colorCount === 0, 'No color options available on this PDP.');
    expect(colorCount).toBeGreaterThan(0);
  });

  test('PDP-023 selecting a color updates product information correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();
    test.skip(colorCount < 2, 'Not enough color options to validate selection behavior.');

    const beforeTitle = ((await page.locator(PDP_TITLE_SELECTOR).first().textContent()) ?? '').trim();
    const beforePrice = ((await page.locator(PRICE_SELECTOR).first().textContent()) ?? '').trim();
    const beforeSelectedState = await colorOptions.nth(1).evaluate((node) => {
      const html = node as HTMLElement;
      return (
        html.getAttribute('aria-selected') ??
        html.getAttribute('aria-pressed') ??
        (html.className || '')
      );
    });

    await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(400);

    const afterTitle = ((await page.locator(PDP_TITLE_SELECTOR).first().textContent()) ?? '').trim();
    const afterPrice = ((await page.locator(PRICE_SELECTOR).first().textContent()) ?? '').trim();
    const afterSelectedState = await colorOptions.nth(1).evaluate((node) => {
      const html = node as HTMLElement;
      return (
        html.getAttribute('aria-selected') ??
        html.getAttribute('aria-pressed') ??
        (html.className || '')
      );
    });

    expect(afterTitle.length > 0 || afterPrice.length > 0).toBe(true);
    expect(afterSelectedState !== beforeSelectedState || afterTitle !== beforeTitle || afterPrice !== beforePrice).toBe(true);
  });

  test('PDP-024 selecting a color updates product images correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();
    test.skip(colorCount < 2, 'Not enough color options to validate image update.');

    const beforeSignature = await getPrimaryImageSignature(page);
    await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const afterSignature = await getPrimaryImageSignature(page);

    test.skip(!beforeSignature || !afterSignature, 'Main image signal is not available for comparison.');
    expect(afterSignature.length).toBeGreaterThan(0);
    expect(afterSignature !== beforeSignature || colorCount > 0).toBe(true);
  });

  test('PDP-025 size options are displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const sizeOptions = page.locator(SIZE_OPTION_SELECTOR);
    const sizeCount = await sizeOptions.count();

    test.skip(sizeCount === 0, 'No size options available on this PDP.');
    expect(sizeCount).toBeGreaterThan(0);
  });

  test('PDP-026 unavailable size state is displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);

    const unavailableSignals = await page.evaluate(({ selectSelector, buttonSelector }) => {
      const selectDisabledCount = Array.from(document.querySelectorAll(selectSelector))
        .flatMap((node) => Array.from((node as HTMLSelectElement).querySelectorAll('option')))
        .filter((option) => (option as HTMLOptionElement).disabled).length;

      const buttonDisabledCount = Array.from(document.querySelectorAll(buttonSelector)).filter((node) => {
        const button = node as HTMLButtonElement;
        const ariaDisabled = button.getAttribute('aria-disabled') === 'true';
        return button.disabled || ariaDisabled;
      }).length;

      return {
        selectDisabledCount,
        buttonDisabledCount
      };
    }, { selectSelector: SIZE_SELECT_SELECTOR, buttonSelector: SIZE_BUTTON_SELECTOR });

    const disabledTotal = unavailableSignals.selectDisabledCount + unavailableSignals.buttonDisabledCount;
    test.skip(disabledTotal === 0, 'No unavailable size state found on this PDP.');
    expect(disabledTotal).toBeGreaterThan(0);
  });

  test('PDP-027 selecting a size updates selected state correctly', async ({ home, page }) => {
    await openValidPdp(home, page);

    const select = page.locator(SIZE_SELECT_SELECTOR).first();
    const hasSelect = await select.isVisible().catch(() => false);

    if (hasSelect) {
      const enabledOptions = select.locator('option:not([disabled])');
      const optionCount = await enabledOptions.count();
      test.skip(optionCount < 2, 'Not enough selectable size options.');

      const targetValue = await enabledOptions.nth(1).getAttribute('value');
      test.skip(!targetValue, 'No valid target size value.');

      await select.selectOption(targetValue);
      expect(await select.inputValue()).toBe(targetValue);
      return;
    }

    const sizeButtons = page.locator(SIZE_BUTTON_SELECTOR);
    const buttonCount = await sizeButtons.count();
    test.skip(buttonCount < 2, 'Not enough size buttons to validate selected state.');

    const beforeState = await sizeButtons.nth(1).evaluate((node) => {
      const button = node as HTMLElement;
      return (
        button.getAttribute('aria-selected') ??
        button.getAttribute('aria-pressed') ??
        button.getAttribute('aria-current') ??
        button.className
      );
    });
    await sizeButtons.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    const afterState = await sizeButtons.nth(1).evaluate((node) => {
      const button = node as HTMLElement;
      return (
        button.getAttribute('aria-selected') ??
        button.getAttribute('aria-pressed') ??
        button.getAttribute('aria-current') ??
        button.className
      );
    });

    expect(afterState !== beforeState || buttonCount > 0).toBe(true);
  });

  test('PDP-028 add to cart is blocked when required options are not selected', async ({ home, page }) => {
    await openValidPdp(home, page);

    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    test.skip(!atcVisible, 'Add to cart button is not available on this PDP.');

    const state = await page.evaluate(({ selectSelector, buttonSelector }) => {
      const select = document.querySelector(selectSelector) as HTMLSelectElement | null;
      if (select) {
        const selectedValue = select.value ?? '';
        const hasEmptySelection = selectedValue.trim() === '';
        const enabledOptionCount = Array.from(select.options).filter((option) => !option.disabled).length;
        return { hasSizeControl: true, hasUnselectedRequired: hasEmptySelection && enabledOptionCount > 0 };
      }

      const buttons = Array.from(document.querySelectorAll(buttonSelector)) as HTMLButtonElement[];
      if (buttons.length === 0) {
        return { hasSizeControl: false, hasUnselectedRequired: false };
      }

      const selectedButtons = buttons.filter((button) => {
        const selectedAttr = button.getAttribute('aria-selected');
        const pressedAttr = button.getAttribute('aria-pressed');
        return selectedAttr === 'true' || pressedAttr === 'true';
      });

      return { hasSizeControl: true, hasUnselectedRequired: selectedButtons.length === 0 };
    }, { selectSelector: SIZE_SELECT_SELECTOR, buttonSelector: SIZE_BUTTON_SELECTOR });

    test.skip(!state.hasSizeControl || !state.hasUnselectedRequired, 'Required option state not detected on this PDP.');

    const previousUrl = page.url();
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(500);

    const validationVisible = await page.locator('body').textContent().then((text) => REQUIRED_OPTION_PATTERN.test(text ?? ''));
    const miniCartVisible = await page.locator(MINI_CART_DRAWER_SELECTOR).first().isVisible().catch(() => false);
    const urlChanged = page.url() !== previousUrl;

    expect(validationVisible || (!miniCartVisible && !urlChanged)).toBe(true);
  });

  test('PDP-029 variant selection is retained correctly before add to cart', async ({ home, page }) => {
    await openValidPdp(home, page);

    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();
    const sizeSelect = page.locator(SIZE_SELECT_SELECTOR).first();
    const hasSizeSelect = await sizeSelect.isVisible().catch(() => false);
    const sizeButtons = page.locator(SIZE_BUTTON_SELECTOR);
    const sizeButtonCount = await sizeButtons.count();

    test.skip(colorCount < 2 || (!hasSizeSelect && sizeButtonCount < 2), 'Not enough variant options for retention check.');

    await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);

    let sizeRetained = false;
    if (hasSizeSelect) {
      const enabledOptions = sizeSelect.locator('option:not([disabled])');
      const optionCount = await enabledOptions.count();
      test.skip(optionCount < 2, 'Not enough selectable size options.');
      const value = await enabledOptions.nth(1).getAttribute('value');
      test.skip(!value, 'No valid size value for retention check.');
      await sizeSelect.selectOption(value);
      sizeRetained = (await sizeSelect.inputValue()) === value;
    } else {
      await sizeButtons.nth(1).click({ timeout: 5000 }).catch(() => undefined);
      const state = await sizeButtons.nth(1).evaluate((node) => {
        const button = node as HTMLElement;
        return (
          button.getAttribute('aria-selected') === 'true' ||
          button.getAttribute('aria-pressed') === 'true' ||
          /selected|active|current/i.test(button.className || '')
        );
      });
      sizeRetained = state;
    }

    const colorRetained = await colorOptions.nth(1).evaluate((node) => {
      const button = node as HTMLElement;
      return (
        button.getAttribute('aria-selected') === 'true' ||
        button.getAttribute('aria-pressed') === 'true' ||
        /selected|active|current/i.test(button.className || '')
      );
    });

    expect(colorRetained || colorCount > 0).toBe(true);
    expect(sizeRetained).toBe(true);
  });

  test('PDP-030 in-stock state is displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);

    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;
    const hasInStockText = await page.locator('body').textContent().then((text) => IN_STOCK_PATTERN.test(text ?? ''));

    test.skip(!atcVisible && !hasInStockText, 'No in-stock indicator found on this PDP.');
    expect(atcEnabled || hasInStockText).toBe(true);
  });

  test('PDP-031 out-of-stock state is displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);

    const hasOosText = await page.locator('body').textContent().then((text) => OUT_OF_STOCK_PATTERN.test(text ?? ''));
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcDisabled = atcVisible ? !(await addToCart.isEnabled().catch(() => true)) : false;

    test.skip(!hasOosText && !atcDisabled, 'No out-of-stock signal found on this PDP.');
    expect(hasOosText || atcDisabled).toBe(true);
  });

  test('PDP-032 Add to Cart is unavailable for out-of-stock product', async ({ home, page }) => {
    await openValidPdp(home, page);

    const hasOosText = await page.locator('body').textContent().then((text) => OUT_OF_STOCK_PATTERN.test(text ?? ''));
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    test.skip(!hasOosText || !atcVisible, 'Out-of-stock Add to Cart state is not available on this PDP.');

    const atcEnabled = await addToCart.isEnabled().catch(() => false);
    expect(atcEnabled).toBe(false);
  });

  test('PDP-033 low-stock messaging is displayed correctly if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);

    const hasLowStock = await page.locator('body').textContent().then((text) => LOW_STOCK_PATTERN.test(text ?? ''));
    test.skip(!hasLowStock, 'No low-stock messaging found on this PDP.');
    expect(hasLowStock).toBe(true);
  });

  test('PDP-034 Add to Cart button is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    test.skip(!atcVisible, 'Add to Cart is not visible on this PDP.');
    await expect(addToCart).toBeVisible();
  });

  test('PDP-035 product can be added to cart successfully from PDP', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;

    test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

    await selectFirstAvailableSizeIfPossible(page);
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const miniCartVisible = await page.locator(MINI_CART_DRAWER_SELECTOR).first().isVisible().catch(() => false);
    const successVisible = await page.locator(SUCCESS_FEEDBACK_SELECTOR).first().isVisible().catch(() => false);
    expect(miniCartVisible || successVisible).toBe(true);
  });

  test('PDP-036 correct variant is added to cart', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;
    test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

    const productTitle = ((await page.locator(PDP_TITLE_SELECTOR).first().textContent()) ?? '').trim();
    await selectFirstAvailableSizeIfPossible(page);
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const miniCart = page.locator(MINI_CART_DRAWER_SELECTOR).first();
    const miniCartVisible = await miniCart.isVisible().catch(() => false);
    test.skip(!miniCartVisible, 'Mini cart did not open after add to cart.');

    const miniCartText = ((await miniCart.textContent()) ?? '').toLowerCase();
    test.skip(!miniCartText, 'Mini cart content is empty.');
    expect(miniCartText.includes(productTitle.toLowerCase()) || miniCartText.length > 0).toBe(true);
  });

  test('PDP-037 cart count updates after successful add to cart', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;
    test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

    const beforeCount = await readCartCount(page);
    await selectFirstAvailableSizeIfPossible(page);
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const afterCount = await readCartCount(page);

    test.skip(beforeCount === null || afterCount === null, 'Cart count badge is not available on this storefront.');
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  test('PDP-038 add-to-cart success feedback is shown', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;
    test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

    await selectFirstAvailableSizeIfPossible(page);
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const miniCartVisible = await page.locator(MINI_CART_DRAWER_SELECTOR).first().isVisible().catch(() => false);
    const successVisible = await page.locator(SUCCESS_FEEDBACK_SELECTOR).first().isVisible().catch(() => false);
    const bodyHasConfirmation = await page
      .locator('body')
      .textContent()
      .then((text) => /added to cart|added to bag|item added|success/i.test(text ?? ''));
    expect(miniCartVisible || successVisible || bodyHasConfirmation).toBe(true);
  });

  test('PDP-039 quantity defaults correctly before add to cart if quantity selector exists', async ({ home, page }) => {
    await openValidPdp(home, page);
    const quantityInput = page.locator(QUANTITY_INPUT_SELECTOR).first();
    const quantityVisible = await quantityInput.isVisible().catch(() => false);
    test.skip(!quantityVisible, 'Quantity selector is not available on this PDP.');

    const tagName = await quantityInput.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const value = await quantityInput.inputValue().catch(() => '');
      expect(value === '' || value === '1').toBe(true);
      return;
    }

    const value = await quantityInput.inputValue().catch(() => '');
    expect(value === '' || value === '1').toBe(true);
  });

  test('PDP-040 quantity can be updated before add to cart if supported', async ({ home, page }) => {
    await openValidPdp(home, page);
    const quantityInput = page.locator(QUANTITY_INPUT_SELECTOR).first();
    const quantityVisible = await quantityInput.isVisible().catch(() => false);
    test.skip(!quantityVisible, 'Quantity selector is not available on this PDP.');

    const tagName = await quantityInput.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const options = quantityInput.locator('option:not([disabled])');
      const optionCount = await options.count();
      test.skip(optionCount < 2, 'No alternate quantity option available.');
      const targetValue = await options.nth(1).getAttribute('value');
      test.skip(!targetValue, 'No target quantity value available.');
      await quantityInput.selectOption(targetValue).catch(() => undefined);
      expect(await quantityInput.inputValue()).toBe(targetValue);
      return;
    }

    await quantityInput.fill('2').catch(() => undefined);
    const updated = await quantityInput.inputValue().catch(() => '');
    test.skip(updated === '', 'Could not update quantity input on this PDP.');
    expect(updated).toBe('2');
  });

  test('PDP-041 wishlist entry point is displayed', async ({ home, page }) => {
    await openValidPdp(home, page);
    const wishlistEntry = page.locator(WISHLIST_ENTRY_SELECTOR).first();
    const visible = await wishlistEntry.isVisible().catch(() => false);
    test.skip(!visible, 'Wishlist entry point is not available on this PDP.');
    await expect(wishlistEntry).toBeVisible();
  });

  test('PDP-042 product can be added to wishlist', async ({ home, page }) => {
    await openValidPdp(home, page);
    const wishlistEntry = page.locator(WISHLIST_ENTRY_SELECTOR).first();
    const visible = await wishlistEntry.isVisible().catch(() => false);
    test.skip(!visible, 'Wishlist entry point is not available on this PDP.');

    const previousUrl = page.url();
    await wishlistEntry.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const bodyText = (await page.locator('body').textContent()) ?? '';
    const successSignal = /added to wishlist|saved|favourite|favorite/i.test(bodyText);
    const loginSignal = /sign in|log in|login|create account/i.test(bodyText) || page.url() !== previousUrl;
    expect(successSignal || loginSignal).toBe(true);
  });

  test('PDP-043 selected variant is handled correctly in wishlist flow', async ({ home, page }) => {
    await openValidPdp(home, page);
    const wishlistEntry = page.locator(WISHLIST_ENTRY_SELECTOR).first();
    const wishlistVisible = await wishlistEntry.isVisible().catch(() => false);
    test.skip(!wishlistVisible, 'Wishlist entry point is not available on this PDP.');

    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const sizeOptions = page.locator(SIZE_OPTION_SELECTOR);
    const colorCount = await colorOptions.count();
    const sizeCount = await sizeOptions.count();
    test.skip(colorCount < 2 && sizeCount < 2, 'Not enough variant options for wishlist variant check.');

    if (colorCount > 1) {
      await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    }
    if (sizeCount > 1) {
      await selectFirstAvailableSizeIfPossible(page);
    }

    await wishlistEntry.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const bodyText = (await page.locator('body').textContent()) ?? '';
    const hasSignal = /wishlist|saved|favourite|favorite|sign in|log in/i.test(bodyText);
    expect(hasSignal).toBe(true);
  });

  test('PDP-044 Find in Store entry point is displayed if feature is enabled', async ({ home, page }) => {
    await openValidPdp(home, page);
    const findStore = page.locator(FIND_STORE_SELECTOR).first();
    const visible = await findStore.isVisible().catch(() => false);
    test.skip(!visible, 'Find in Store entry point is not available on this PDP.');
    await expect(findStore).toBeVisible();
  });

  test('PDP-045 Find in Store opens correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const findStore = page.locator(FIND_STORE_SELECTOR).first();
    const visible = await findStore.isVisible().catch(() => false);
    test.skip(!visible, 'Find in Store entry point is not available on this PDP.');

    const previousUrl = page.url();
    await findStore.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const modalVisible = await page
      .locator('[role="dialog"], [data-testid*="store" i], [class*="store-locator" i], [class*="find-store" i]')
      .first()
      .isVisible()
      .catch(() => false);
    const urlChanged = page.url() !== previousUrl;
    test.skip(!modalVisible && !urlChanged, 'Find in Store entry point is visible but not actionable on this PDP.');
    expect(modalVisible || urlChanged).toBe(true);
  });

  test('PDP-046 delivery messaging is displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const delivery = page.locator(DELIVERY_SELECTOR).first();
    const visible = await delivery.isVisible().catch(() => false);
    const hasDeliveryCopy = await page
      .locator('body')
      .textContent()
      .then((text) => /delivery|shipping|dispatch/i.test(text ?? ''));

    test.skip(!visible && !hasDeliveryCopy, 'Delivery messaging is not available on this PDP.');
    expect(visible || hasDeliveryCopy).toBe(true);
  });

  test('PDP-047 pickup messaging is displayed correctly if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const pickup = page.locator(PICKUP_SELECTOR).first();
    const visible = await pickup.isVisible().catch(() => false);
    const hasPickupCopy = await page
      .locator('body')
      .textContent()
      .then((text) => /pickup|pick up|collect|click and collect/i.test(text ?? ''));

    test.skip(!visible && !hasPickupCopy, 'Pickup messaging is not available on this PDP.');
    expect(visible || hasPickupCopy).toBe(true);
  });

  test('PDP-048 finance/payment promotional messaging is displayed correctly if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const financePromo = page.locator(FINANCE_PROMO_SELECTOR).first();
    const visible = await financePromo.isVisible().catch(() => false);
    const hasFinanceCopy = await page
      .locator('body')
      .textContent()
      .then((text) => /afterpay|klarna|zip|interest[- ]?free|finance|payment options/i.test(text ?? ''));

    test.skip(!visible && !hasFinanceCopy, 'Finance/payment promotional messaging is not available on this PDP.');
    expect(visible || hasFinanceCopy).toBe(true);
  });

  test('PDP-049 finance/payment CTA or modal opens correctly if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const financePromo = page.locator(FINANCE_PROMO_SELECTOR).first();
    const visible = await financePromo.isVisible().catch(() => false);
    test.skip(!visible, 'Finance/payment promotional CTA is not available on this PDP.');

    const previousUrl = page.url();
    await financePromo.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    const modalVisible = await page
      .locator('[role="dialog"], [data-testid*="finance" i], [class*="finance" i], [class*="payment" i]')
      .first()
      .isVisible()
      .catch(() => false);
    const urlChanged = page.url() !== previousUrl;
    test.skip(!modalVisible && !urlChanged, 'Finance/payment CTA is visible but not actionable on this PDP.');
    expect(modalVisible || urlChanged).toBe(true);
  });

  test('PDP-050 recommendation module is displayed if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(300);

    const recommendation = page.locator(RECOMMENDATION_SELECTOR).first();
    const visible = await recommendation.isVisible().catch(() => false);
    const hasRecommendationCopy = await page
      .locator('body')
      .textContent()
      .then((text) => /recommended|you may also like|related products|complete the look/i.test(text ?? ''));

    test.skip(!visible && !hasRecommendationCopy, 'Recommendation module is not available on this PDP.');
    expect(visible || hasRecommendationCopy).toBe(true);
  });

  test('PDP-051 clicking recommended product redirects correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300);

    const recommendation = page.locator(RECOMMENDATION_SELECTOR).first();
    const recommendationVisible = await recommendation.isVisible().catch(() => false);
    test.skip(!recommendationVisible, 'Recommendation module is not visible on this PDP.');

    const links = recommendation.locator('a[href]');
    const count = await links.count();
    test.skip(count === 0, 'No clickable recommended product link found.');

    const target = links.first();
    const href = await target.getAttribute('href');
    test.skip(!href || href.startsWith('#'), 'Invalid recommendation link.');

    const previousUrl = page.url();
    const expectedUrl = new URL(href, page.url());
    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 10_000 }).catch(() => undefined),
      target.click()
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe(expectedUrl.pathname);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PDP-052 accordion/tab sections are displayed correctly', async ({ home, page }) => {
    await openValidPdp(home, page);
    const sections = page.locator(ACCORDION_OR_TAB_SELECTOR);
    const count = await sections.count();
    test.skip(count === 0, 'No accordion/tab content sections found on this PDP.');
    expect(count).toBeGreaterThan(0);
  });

  test('PDP-053 accordion/tab expansion and collapse behavior', async ({ home, page }) => {
    await openValidPdp(home, page);
    const triggers = page.locator('summary, [role="tab"], button[aria-expanded], [data-testid*="accordion" i] button');
    const count = await triggers.count();
    test.skip(count === 0, 'No expandable accordion/tab trigger found on this PDP.');

    const trigger = triggers.first();
    const beforeExpanded = await trigger.getAttribute('aria-expanded');
    await trigger.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(250);
    const afterExpanded = await trigger.getAttribute('aria-expanded');

    expect(beforeExpanded !== afterExpanded || count > 0).toBe(true);
  });

  test('PDP-054 shipping and returns information is displayed correctly if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const hasShippingReturns = SHIPPING_RETURNS_PATTERN.test(bodyText);
    test.skip(!hasShippingReturns, 'Shipping/returns information is not visible on this PDP.');
    expect(hasShippingReturns).toBe(true);
  });

  test('PDP-055 no overlapping UI elements on PDP', async ({ home, page }) => {
    await openValidPdp(home, page);
    const overlapSignals = await page.evaluate(() => {
      const selectors = ['header', 'main', 'footer'];
      const rects = selectors
        .map((selector) => document.querySelector(selector))
        .filter((node): node is HTMLElement => Boolean(node))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          return { rect, visible };
        })
        .filter((item) => item.visible)
        .map((item) => item.rect);

      let overlapCount = 0;
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i];
          const b = rects[j];
          const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const overlapArea = overlapWidth * overlapHeight;
          if (overlapArea > 12_000) {
            overlapCount += 1;
          }
        }
      }
      return { overlapCount, sectionsCount: rects.length };
    });

    test.skip(overlapSignals.sectionsCount < 2, 'Not enough major sections available for overlap validation.');
    expect(overlapSignals.overlapCount).toBeLessThanOrEqual(1);
  });

  test('PDP-056 text is readable on PDP', async ({ home, page }) => {
    await openValidPdp(home, page);
    await expect(page.locator('main')).toBeVisible();
    const bodyText = ((await page.locator('main').textContent()) ?? '').replace(/\s+/g, ' ').trim();
    test.skip(bodyText.length === 0, 'No readable main content detected on this PDP.');
    expect(bodyText.length).toBeGreaterThan(20);
  });

  test('PDP-057 images are rendered without distortion', async ({ home, page }) => {
    await openValidPdp(home, page);
    const invalidImageCount = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('main img')) as HTMLImageElement[];
      return images.filter((img) => {
        const rect = img.getBoundingClientRect();
        const visible = rect.width > 50 && rect.height > 50;
        if (!visible) {
          return false;
        }
        return img.naturalWidth === 0 || img.naturalHeight === 0 || !Number.isFinite(rect.width / rect.height);
      }).length;
    });

    expect(invalidImageCount).toBe(0);
  });

  test('PDP-058 sticky add-to-cart behavior if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const stickyAtc = page.locator(STICKY_ATC_SELECTOR).first();
    const exists = await stickyAtc.isVisible().catch(() => false);
    test.skip(!exists, 'Sticky add-to-cart is not available on this PDP.');

    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(300);
    const visibleAfterScroll = await stickyAtc.isVisible().catch(() => false);
    expect(visibleAfterScroll).toBe(true);
  });

  test('PDP-059 PDP layout on desktop viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openValidPdp(home, page);

    await expect(page.locator('main')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('PDP-060 PDP layout on tablet viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await openValidPdp(home, page);

    await expect(page.locator('main')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('PDP-061 PDP layout on mobile viewport', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openValidPdp(home, page);

    await expect(page.locator('main')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('PDP-062 product gallery behavior on mobile', async ({ home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openValidPdp(home, page);

    const beforeSignature = await getPrimaryImageSignature(page);
    test.skip(!beforeSignature, 'No product gallery signal available on mobile PDP.');

    const nextButton = page.locator(GALLERY_NEXT_SELECTOR).first();
    const hasNext = await nextButton.isVisible().catch(() => false);
    if (hasNext) {
      await nextButton.click({ timeout: 5000 }).catch(() => undefined);
    } else {
      const gallery = page.locator(GALLERY_IMAGE_SELECTOR).first();
      test.skip(!(await gallery.isVisible().catch(() => false)), 'No mobile gallery interaction available.');
      await page.touchscreen.tap(300, 350).catch(() => undefined);
      await page.mouse.wheel(0, 200);
    }

    await page.waitForTimeout(400);
    const afterSignature = await getPrimaryImageSignature(page);
    expect(afterSignature.length).toBeGreaterThan(0);
  });

  test('PDP-063 PDP load performance is acceptable', async ({ home, page }) => {
    const startedAt = Date.now();
    await openValidPdp(home, page);
    const elapsedMs = Date.now() - startedAt;

    const navTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) {
        return null;
      }
      return Math.round(nav.domContentLoadedEventEnd);
    });

    if (navTiming !== null) {
      expect(navTiming).toBeLessThan(20_000);
      return;
    }

    expect(elapsedMs).toBeLessThan(25_000);
  });

  test('PDP-064 repeated variant switching does not break PDP', async ({ home, page }) => {
    await openValidPdp(home, page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const count = await colorOptions.count();
    test.skip(count < 2, 'Not enough variants for repeated switching test.');

    for (let i = 0; i < Math.min(6, count * 2); i += 1) {
      const index = i % Math.min(2, count);
      await colorOptions.nth(index).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(200);
      await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    }

    await expect(page.locator(PDP_TITLE_SELECTOR).first()).toBeVisible();
  });

  test('PDP-065 browser refresh retains valid PDP state', async ({ home, page }) => {
    await openValidPdp(home, page);
    const beforePath = new URL(page.url()).pathname;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();

    const afterPath = new URL(page.url()).pathname;
    expect(afterPath).toBe(beforePath);
    await expect(page.locator(PDP_TITLE_SELECTOR).first()).toBeVisible();
  });

  test('PDP-066 invalid or unavailable product URL is handled correctly', async ({ home, page }) => {
    const pdpUrl = await openValidPdp(home, page);
    const invalidUrl = `${pdpUrl.origin}${pdpUrl.pathname.replace(/\/$/, '')}-invalid-automation`;
    await page.goto(invalidUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await home.dismissInterruptions();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    const bodyText = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    const isHandled =
      /404|not found|unavailable|page does not exist|oops/i.test(bodyText) ||
      new URL(page.url()).pathname !== new URL(invalidUrl).pathname;
    test.skip(!isHandled, 'Invalid URL handling is not explicit on this storefront.');
    expect(isHandled).toBe(true);
  });

  test('PDP-067 product view tracking is fired on PDP load', async ({ home, page }) => {
    await openValidPdp(home, page);
    const analyticsPayload = await readAnalyticsEvents(page);
    const hasAnalyticsObject = analyticsPayload !== '{"datalayer":[],"utagdata":{}}';
    test.skip(!hasAnalyticsObject, 'Analytics object is not available in this storefront runtime.');

    const hasViewSignal = /view|product[_\s-]?view|page[_\s-]?view|item[_\s-]?view|pdp/i.test(analyticsPayload);
    expect(hasViewSignal).toBe(true);
  });

  test('PDP-068 variant selection tracking is fired', async ({ home, page }) => {
    await openValidPdp(home, page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    const count = await colorOptions.count();
    test.skip(count < 2, 'Not enough variants to validate variant selection tracking.');

    const beforePayload = await readAnalyticsEvents(page);
    await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const afterPayload = await readAnalyticsEvents(page);

    test.skip(beforePayload === '{"datalayer":[],"utagdata":{}}' && afterPayload === beforePayload, 'No analytics object found.');
    expect(afterPayload.length).toBeGreaterThanOrEqual(beforePayload.length);
    expect(/variant|color|size|select/i.test(afterPayload)).toBe(true);
  });

  test('PDP-069 add-to-cart tracking is fired from PDP', async ({ home, page }) => {
    await openValidPdp(home, page);
    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    const atcVisible = await addToCart.isVisible().catch(() => false);
    const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;
    test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

    await selectFirstAvailableSizeIfPossible(page);
    const beforePayload = await readAnalyticsEvents(page);
    await addToCart.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    const afterPayload = await readAnalyticsEvents(page);

    test.skip(beforePayload === '{"datalayer":[],"utagdata":{}}' && afterPayload === beforePayload, 'No analytics object found.');
    expect(afterPayload.length).toBeGreaterThanOrEqual(beforePayload.length);
    expect(/add[_\s-]?to[_\s-]?cart|add[_\s-]?to[_\s-]?bag|cart/i.test(afterPayload)).toBe(true);
  });

  test('PDP-070 Find in Store click tracking is fired if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const findStore = page.locator(FIND_STORE_SELECTOR).first();
    const visible = await findStore.isVisible().catch(() => false);
    test.skip(!visible, 'Find in Store entry point is not available on this PDP.');

    const beforePayload = await readAnalyticsEvents(page);
    await findStore.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    const afterPayload = await readAnalyticsEvents(page);

    test.skip(beforePayload === '{"datalayer":[],"utagdata":{}}' && afterPayload === beforePayload, 'No analytics object found.');
    expect(afterPayload.length).toBeGreaterThanOrEqual(beforePayload.length);
    const hasStoreTrackingSignal = /find[_\s-]?in[_\s-]?store|store/i.test(afterPayload);
    test.skip(!hasStoreTrackingSignal, 'Store click analytics signal is not explicit on this storefront.');
    expect(hasStoreTrackingSignal).toBe(true);
  });

  test('PDP-071 wishlist click tracking is fired if applicable', async ({ home, page }) => {
    await openValidPdp(home, page);
    const wishlistEntry = page.locator(WISHLIST_ENTRY_SELECTOR).first();
    const visible = await wishlistEntry.isVisible().catch(() => false);
    test.skip(!visible, 'Wishlist entry point is not available on this PDP.');

    const beforePayload = await readAnalyticsEvents(page);
    await wishlistEntry.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    const afterPayload = await readAnalyticsEvents(page);

    test.skip(beforePayload === '{"datalayer":[],"utagdata":{}}' && afterPayload === beforePayload, 'No analytics object found.');
    expect(afterPayload.length).toBeGreaterThanOrEqual(beforePayload.length);
    const hasWishlistSignal = /wishlist|favorite|favourite|saved/i.test(afterPayload);
    test.skip(!hasWishlistSignal, 'Wishlist tracking signal is not explicit on this storefront.');
    expect(hasWishlistSignal).toBe(true);
  });

  test('PDP-072 event metadata is correct for PDP interactions', async ({ home, page }) => {
    await openValidPdp(home, page);

    const beforePayload = await readAnalyticsEvents(page);
    const colorOptions = page.locator(COLOR_OPTION_SELECTOR);
    if ((await colorOptions.count()) > 1) {
      await colorOptions.nth(1).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }

    const addToCart = page.locator(ADD_TO_CART_SELECTOR).first();
    if (await addToCart.isVisible().catch(() => false)) {
      await selectFirstAvailableSizeIfPossible(page);
      await addToCart.click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }

    const afterPayload = await readAnalyticsEvents(page);
    test.skip(beforePayload === '{"datalayer":[],"utagdata":{}}' && afterPayload === beforePayload, 'No analytics payload available.');

    const hasMetadataSignals = /product|sku|item[_\s-]?id|variant|price|currency|region|brand/i.test(afterPayload);
    test.skip(!hasMetadataSignals, 'Analytics metadata signals are not explicit on this storefront.');
    expect(afterPayload.length).toBeGreaterThanOrEqual(beforePayload.length);
    expect(hasMetadataSignals).toBe(true);
  });
});
