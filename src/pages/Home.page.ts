import type { Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  async search(keyword: string): Promise<void> {
    await this.header.searchFor(keyword);
    await this.dismissInterruptions();
  }
}
