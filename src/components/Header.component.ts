import type { Locator, Page } from '@playwright/test';
import type { Selectors } from '../core/types';
import { SearchComponent } from './Search.component';

export interface NavigationItem {
  index: number;
  text: string;
  href: string;
}

export class HeaderComponent {
  readonly search: SearchComponent;

  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {
    this.search = new SearchComponent(page, selectors);
  }

  get cartIcon(): Locator {
    return this.page.locator(this.selectors.header.cartIcon).first();
  }

  get logo(): Locator {
    return this.page.locator(this.selectors.header.logo).first();
  }

  get navigation(): Locator {
    return this.page.locator(this.selectors.header.navigation).first();
  }

  get navigationLinks(): Locator {
    return this.navigation.locator(this.selectors.header.navigationLink);
  }

  get submenu(): Locator {
    return this.page.locator(this.selectors.header.submenu);
  }

  async getVisibleNavigationItems(): Promise<NavigationItem[]> {
    return this.navigationLinks.evaluateAll((elements) =>
      elements
        .map((element, index) => {
          const anchor = element as HTMLAnchorElement;
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const href = anchor.href;
          const text = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';

          return { index, text, href, visible };
        })
        .filter(
          (item) =>
            item.visible &&
            item.text.length > 0 &&
            item.href.length > 0 &&
            !item.href.startsWith('javascript:') &&
            !item.href.endsWith('#')
        )
        .map(({ index, text, href }) => ({ index, text, href }))
    );
  }

  async clickLogo(): Promise<void> {
    await this.logo.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openCart(): Promise<void> {
    await this.cartIcon.click();
  }

  async searchFor(keyword: string): Promise<void> {
    await this.search.search(keyword);
  }
}
