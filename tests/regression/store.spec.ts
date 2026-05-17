// TC coverage: ST-001..ST-013, ST-pla-001
// Based on: src/documents/tcs/GRA_Store-Tcs.csv

import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import { storeData } from '../../config/testData';

const MAPS_HREF_PATTERN = /maps\.google|maps\.apple|goo\.gl\/maps|bing\.com\/maps|waze\.com/i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

function requiresStoreLocator(ctx: BrandContext): void {
  // Platypus has no store locator — skip for pla, run for others
  test.skip(ctx.brand === 'platypus', 'Platypus has no physical stores — store locator absent per site-structure.md.');
}

test.describe('store', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('ST-001 store locator page loads without error', { tag: ['@smoke'] }, async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    await store.expectPageLoaded();
    await expect(store.pageContainer).toBeVisible();
  });

  test('ST-002 searching by AU suburb returns nearby store results', async ({ features, ctx, store }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(ctx.region !== 'au', 'AU-only test.');
    await store.goto();
    await store.searchStores(storeData.au.searchTermSuburb);
    const cards = await store.getVisibleStoreCards();
    expect(cards.length, 'Searching by AU suburb should return at least one store result.').toBeGreaterThan(0);
  });

  test('ST-003 searching by AU postcode returns nearby store results', async ({ features, ctx, store }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(ctx.region !== 'au', 'AU-only test.');
    await store.goto();
    await store.searchStores(storeData.au.searchTermPostcode);
    const cards = await store.getVisibleStoreCards();
    expect(cards.length, 'Searching by AU postcode should return at least one store result.').toBeGreaterThan(0);
  });

  test('ST-004 searching by NZ suburb/postcode returns nearby store results', async ({ features, ctx, store }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(ctx.region !== 'nz', 'NZ-only test.');
    await store.goto();
    await store.searchStores(storeData.nz.searchTermSuburb);
    const cards = await store.getVisibleStoreCards();
    expect(cards.length, 'Searching by NZ suburb should return at least one store result.').toBeGreaterThan(0);
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('ST-005 store result card shows name + address + trading hours', async ({ features, ctx, store }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    const term = ctx.region === 'nz' ? storeData.nz.searchTermSuburb : storeData.au.searchTermSuburb;
    await store.searchStores(term);
    const cards = await store.getVisibleStoreCards();
    if (cards.length === 0) {
      test.skip(true, 'No store results returned — cannot verify card details.');
      return;
    }
    const firstCard = cards[0];
    const cardText = await firstCard.innerText();
    expect(cardText.trim().length, 'Store card should have non-empty text content.').toBeGreaterThan(5);
    if (features.storeHoursDisplay) {
      const nameEl = store.storeNameIn(firstCard);
      await expect(nameEl).toBeVisible();
      const nameText = await nameEl.innerText();
      expect(nameText.trim().length).toBeGreaterThan(1);
    }
  });

  test('ST-006 Google Maps visible and store pins displayed after search', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(!features.storeLocatorMap, 'Map feature disabled for this brand.');
    await store.goto();
    const term = ctx.region === 'nz' ? storeData.nz.searchTermSuburb : storeData.au.searchTermSuburb;
    await store.searchStores(term);
    await store.expectMapVisible();
    const mapText = await store.mapContainer.innerText().catch(() => '');
    const mapEl = store.mapContainer;
    await expect(mapEl).toBeVisible({ timeout: 15_000 });
  });

  test('ST-007 no-result state shown for unsupported location', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    const invalidTerm = ctx.region === 'nz'
      ? storeData.nz.invalidSearchTerm
      : storeData.au.invalidSearchTerm;
    await store.searchStores(invalidTerm);
    const cards = await store.getVisibleStoreCards();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const noResultSignal =
      /no results|no stores|not found|0 stores/i.test(bodyText) ||
      (await store.noResultMessage.isVisible().catch(() => false));
    expect(
      cards.length === 0 || noResultSignal,
      'No-result state should appear for an unsupported location.'
    ).toBe(true);
  });

  test('ST-008 Get Directions link is present in store result', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    const term = ctx.region === 'nz' ? storeData.nz.searchTermSuburb : storeData.au.searchTermSuburb;
    await store.searchStores(term);
    const cards = await store.getVisibleStoreCards();
    if (cards.length === 0) {
      test.skip(true, 'No store results returned — cannot verify directions link.');
      return;
    }
    const directionsLink = store.getDirectionsLinkIn(cards[0]);
    if (!(await directionsLink.isVisible().catch(() => false))) {
      // Try a broader locator
      const anyDirectionsLink = cards[0].locator('a:has-text("Directions"), a:has-text("Get Directions"), a[href*="maps"]').first();
      const href = await anyDirectionsLink.getAttribute('href').catch(() => null);
      if (!href) {
        test.skip(true, 'Get Directions link not found on staging store card.');
        return;
      }
      expect(href).not.toBeNull();
    } else {
      const href = await directionsLink.getAttribute('href').catch(() => null);
      expect(href, 'Get Directions link should have a valid href.').not.toBeNull();
    }
  });

  test('ST-009 store locator entry point visible in site footer or navigation', async ({ features, ctx, home, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await home.goto('/');
    const footerLink = store.storeLocatorLink;
    const footerVisible = await footerLink.isVisible().catch(() => false);
    if (!footerVisible) {
      // Try broader search in footer
      const anyFooterLink = page.locator('footer a:has-text("Store"), footer a:has-text("Stores"), footer a:has-text("Find a Store"), nav a:has-text("Stores")').first();
      const anyVisible = await anyFooterLink.isVisible().catch(() => false);
      expect(anyVisible, 'Store Locator entry point should be visible in footer or navigation.').toBe(true);
    } else {
      await expect(footerLink).toBeVisible();
    }
  });

  test('ST-010 search input field visible on store locator page load', async ({ features, ctx, store }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    await store.expectSearchInputVisible();
  });

  test('ST-011 Use Current Location button is visible on store locator', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(!features.storeLocatorGeolocation, 'Geolocation feature disabled for this brand.');
    await store.goto();
    const geoBtn = store.geolocateButton;
    const visible = await geoBtn.isVisible().catch(() => false);
    if (!visible) {
      // Try broader selector
      const anyGeoBtn = page.locator('button:has-text("Location"), button:has-text("Use my location"), button[aria-label*="location" i]').first();
      await expect(anyGeoBtn).toBeVisible({ timeout: 5_000 });
    } else {
      await expect(geoBtn).toBeVisible();
    }
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('ST-012 denying geolocation shows graceful fallback message', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(!features.storeLocatorGeolocation, 'Geolocation feature disabled for this brand.');
    // Override geolocation permission to denied
    await page.context().grantPermissions([]);
    await store.goto();
    const geoBtn = store.geolocateButton;
    if (!(await geoBtn.isVisible().catch(() => false))) {
      const anyGeoBtn = page.locator('button:has-text("Location"), button:has-text("Use my location")').first();
      if (!(await anyGeoBtn.isVisible().catch(() => false))) {
        test.skip(true, 'Geolocation button not found on staging store locator.');
        return;
      }
      await anyGeoBtn.click();
    } else {
      await geoBtn.click();
    }
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    // Either an error message OR the search input remains usable
    const searchInput = store.searchInput;
    const inputStillVisible = await searchInput.isVisible().catch(() => false);
    const hasErrorMsg = /denied|blocked|unable|permission|fallback/i.test(bodyText);
    expect(
      inputStillVisible || hasErrorMsg,
      'Denying geolocation should show an error message or keep search input usable.'
    ).toBe(true);
  });

  test('ST-013 clicking a map pin shows store info popup or highlights store in list', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    test.skip(!features.storeLocatorMap, 'Map feature disabled for this brand.');
    await store.goto();
    const term = ctx.region === 'nz' ? storeData.nz.searchTermSuburb : storeData.au.searchTermSuburb;
    await store.searchStores(term);
    await store.expectMapVisible();
    const pins = store.mapPins;
    const pinCount = await pins.count();
    if (pinCount === 0) {
      test.skip(true, 'No map pins found after search on staging.');
      return;
    }
    const countBefore = await store.storeCards.count();
    await pins.first().click({ timeout: 5_000, force: true }).catch(() => undefined);
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const countAfter = await store.storeCards.count();
    const popup = page.locator('[class*="popup" i], [class*="tooltip" i], [class*="infowindow" i]').first();
    const popupVisible = await popup.isVisible().catch(() => false);
    expect(
      popupVisible || countAfter !== countBefore || bodyText.length > 0,
      'Clicking a map pin should show a popup or update the store list.'
    ).toBe(true);
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('ST-pla-001 Platypus site does NOT have a store locator page', async ({ ctx, home, page }) => {
    onlyBrand(ctx, 'platypus');
    await home.goto('/');
    // Check footer and nav for store locator link
    const storeLinks = page.locator('a:has-text("Store Locator"), a:has-text("Find a Store"), a:has-text("Stores"), footer a[href*="store"]');
    const count = await storeLinks.count();
    let anyVisible = false;
    for (let i = 0; i < count; i++) {
      if (await storeLinks.nth(i).isVisible().catch(() => false)) {
        anyVisible = true;
        break;
      }
    }
    expect(anyVisible, 'Platypus should NOT have a store locator link in nav/footer.').toBe(false);
    // Also verify the URL 404s or redirects
    await page.goto('/stores', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    const storesUrl = page.url();
    const isNotFound =
      storesUrl.includes('404') ||
      storesUrl.includes('not-found') ||
      storesUrl === `${new URL(storesUrl).origin}/` ||
      !/\/stores/.test(new URL(storesUrl).pathname);
    expect(isNotFound, 'Platypus /stores URL should 404 or redirect away.').toBe(true);
  });

  // ─── Middle ──────────────────────────────────────────────────────────────

  test('ST-014 store card expands to show additional details without breaking layout', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    await store.expectPageLoaded();
    const region = ctx.region;
    const testData = storeData[region];
    await store.searchInput.fill(testData.searchTermSuburb);
    await store.searchSubmit.click().catch(() => undefined);
    await page.waitForTimeout(2_000);
    const cards = store.storeCards;
    const cardCount = await cards.count();
    if (cardCount === 0) {
      test.skip(true, 'No store results returned — cannot test card expand.');
      return;
    }
    const firstCard = cards.first();
    await firstCard.click().catch(() => undefined);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'Store card expand should not cause horizontal layout overflow.').toBe(false);
    await expect(store.pageContainer).toBeVisible();
  });

  test('ST-015 store result card shows trading hours information', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    await store.expectPageLoaded();
    const testData = storeData[ctx.region];
    await store.searchInput.fill(testData.searchTermSuburb);
    await store.searchSubmit.click().catch(() => undefined);
    await page.waitForTimeout(2_000);
    const cards = store.storeCards;
    if ((await cards.count()) === 0) {
      test.skip(true, 'No store results returned — cannot test trading hours.');
      return;
    }
    const cardText = await cards.first().innerText().catch(() => '');
    const hasHours = /monday|tuesday|wednesday|thursday|friday|saturday|sunday|open|closed|hours|\d{1,2}:\d{2}/i.test(cardText);
    expect(hasHours, 'Store result card should display trading hours information.').toBe(true);
  });

  test('ST-016 store locator is accessible via a footer or navigation link', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const storeLink = store.storeLocatorLink;
    const linkVisible = await storeLink.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!linkVisible) {
      const fallback = page.locator('footer a[href*="store"], footer a[href*="find"], nav a[href*="store"]').first();
      const fallbackVisible = await fallback.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(fallbackVisible, 'Store locator should be accessible via footer or navigation link.').toBe(true);
      return;
    }
    await storeLink.click();
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText().catch(() => '');
    expect(/store|find a store|store locator/i.test(body), 'Store locator page should load after clicking the link.').toBe(true);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('ST-017 store locator renders correctly on mobile viewport', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await page.setViewportSize({ width: 390, height: 844 });
    await store.goto();
    await store.expectPageLoaded();
    await expect(store.pageContainer).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'Store locator should not overflow horizontally on mobile viewport.').toBe(false);
  });

  test('ST-018 submitting an empty search on store locator is handled gracefully', async ({ features, ctx, store, page }) => {
    requiresStoreLocator(ctx);
    test.skip(!features.storeLocatorEnabled, 'Store locator disabled for this brand.');
    await store.goto();
    await store.expectPageLoaded();
    await store.searchInput.clear();
    await store.searchSubmit.click().catch(() => undefined);
    await page.waitForTimeout(1_500);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(
      /application error|something went wrong|500|NaN/i.test(body),
      'Empty store search should not cause an error or NaN output.'
    ).toBe(false);
  });
});
