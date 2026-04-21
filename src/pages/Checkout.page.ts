import type { Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  async fillEmail(email: string): Promise<void> {
    const emailInput = this.selectors.checkout?.emailInput;
    if (!emailInput) {
      return;
    }

    await this.page.locator(emailInput).first().fill(email);
  }
}
