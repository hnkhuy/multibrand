import type { Locator, Page } from '@playwright/test';
import type { Selectors } from '../core/types';
import { SearchComponent } from './Search.component';

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

  async openCart(): Promise<void> {
    await this.cartIcon.click();
  }

  async searchFor(keyword: string): Promise<void> {
    await this.search.search(keyword);
  }
}
