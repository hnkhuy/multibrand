import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class StorePage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get browserPage(): Page {
    return this.page;
  }

  // ─── Store Locator Page ───────────────────────────────────────────────────────

  get storeLocatorLink(): Locator {
    return this.page.locator(this.selectors.store?.storeLocatorLink ?? '').first();
  }

  get pageContainer(): Locator {
    return this.page.locator(this.selectors.store?.pageContainer ?? 'main').first();
  }

  get searchInput(): Locator {
    return this.page.locator(this.selectors.store?.searchInput ?? '').first();
  }

  get searchSubmit(): Locator {
    return this.page.locator(this.selectors.store?.searchSubmit ?? '').first();
  }

  get storeList(): Locator {
    return this.page.locator(this.selectors.store?.storeList ?? '').first();
  }

  get storeCards(): Locator {
    return this.page.locator(this.selectors.store?.storeCard ?? '');
  }

  get noResultMessage(): Locator {
    return this.page.locator(this.selectors.store?.noResultMessage ?? '').first();
  }

  get mapContainer(): Locator {
    return this.page.locator(this.selectors.store?.mapContainer ?? '').first();
  }

  get mapPins(): Locator {
    return this.page.locator(this.selectors.store?.mapPin ?? '');
  }

  get geolocateButton(): Locator {
    return this.page.locator(this.selectors.store?.geolocateButton ?? '').first();
  }

  get storeFilterPanel(): Locator {
    return this.page.locator(this.selectors.store?.storeFilterPanel ?? '').first();
  }

  get storeFilters(): Locator {
    return this.page.locator(this.selectors.store?.storeFilter ?? '');
  }

  // ─── Store Card Sub-locators ──────────────────────────────────────────────────

  storeNameIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.storeName ?? 'h2, h3, strong').first();
  }

  storeAddressIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.storeAddress ?? 'address, [class*="address" i]').first();
  }

  storePhoneIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.storePhone ?? 'a[href^="tel:"]').first();
  }

  storeHoursIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.storeHours ?? '[class*="hours" i]').first();
  }

  storeDistanceIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.storeDistance ?? '[class*="distance" i]').first();
  }

  getDirectionsLinkIn(card: Locator): Locator {
    return card.locator(this.selectors.store?.getDirectionsLink ?? 'a:has-text("Directions")').first();
  }

  // ─── Find in Store (PDP) ──────────────────────────────────────────────────────

  get findInStoreButton(): Locator {
    return this.page.locator(this.selectors.store?.findInStoreButton ?? '').first();
  }

  get findInStoreModal(): Locator {
    return this.page.locator(this.selectors.store?.findInStoreModal ?? '[role="dialog"]').first();
  }

  get findInStoreSearch(): Locator {
    return this.page.locator(this.selectors.store?.findInStoreSearch ?? '').first();
  }

  get findInStoreSubmit(): Locator {
    return this.page.locator(this.selectors.store?.findInStoreSubmit ?? '').first();
  }

  get availabilityResults(): Locator {
    return this.page.locator(this.selectors.store?.availabilityResult ?? '');
  }

  get availabilityStatus(): Locator {
    return this.page.locator(this.selectors.store?.availabilityStatus ?? '').first();
  }

  get closeModalButton(): Locator {
    return this.page.locator(this.selectors.store?.closeModal ?? '[role="dialog"] button[aria-label*="close" i]').first();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    const candidates = ['/store-locator', '/find-a-store', '/stores', '/store-finder', '/store'];
    for (const path of candidates) {
      await this.page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      const status = await this.page.evaluate(() => document.readyState).catch(() => 'loading');
      if (status !== 'loading') {
        const url = this.page.url();
        if (!url.endsWith('/404') && !url.includes('not-found')) {
          return;
        }
      }
    }
  }

  async searchStores(term: string): Promise<void> {
    const input = this.searchInput;
    if (!(await input.isVisible().catch(() => false))) return;
    await input.fill(term);
    const submit = this.searchSubmit;
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
    } else {
      await input.press('Enter');
    }
    await this.page.waitForTimeout(2000);
  }

  async getVisibleStoreCards(): Promise<Locator[]> {
    const count = await this.storeCards.count();
    const visible: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.storeCards.nth(i);
      if (await card.isVisible().catch(() => false)) {
        visible.push(card);
      }
    }
    return visible;
  }

  async openFindInStore(): Promise<void> {
    const btn = this.findInStoreButton;
    if (!(await btn.isVisible().catch(() => false))) return;
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  async closeFindInStore(): Promise<void> {
    const closeBtn = this.closeModalButton;
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(400);
      return;
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async searchAvailability(term: string): Promise<void> {
    const input = this.findInStoreSearch;
    if (!(await input.isVisible().catch(() => false))) return;
    await input.fill(term);
    const submit = this.findInStoreSubmit;
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
    } else {
      await input.press('Enter');
    }
    await this.page.waitForTimeout(2000);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async expectPageLoaded(): Promise<void> {
    await expect(this.pageContainer).toBeVisible({ timeout: 15_000 });
  }

  async expectStoreResultsVisible(): Promise<void> {
    await expect(this.storeCards.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectSearchInputVisible(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: 10_000 });
  }

  async expectMapVisible(): Promise<void> {
    await expect(this.mapContainer).toBeVisible({ timeout: 15_000 });
  }

  async expectFindInStoreModalVisible(): Promise<void> {
    await expect(this.findInStoreModal).toBeVisible({ timeout: 10_000 });
  }

  async expectFindInStoreModalHidden(): Promise<void> {
    await expect(this.findInStoreModal).not.toBeVisible({ timeout: 5_000 });
  }

  async expectNoResultMessageVisible(): Promise<void> {
    await expect(this.noResultMessage).toBeVisible({ timeout: 10_000 });
  }
}
