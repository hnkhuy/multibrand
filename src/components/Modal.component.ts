import type { Page } from '@playwright/test';
import type { Selectors } from '../core/types';

export class ModalComponent {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {}

  async closeIfVisible(): Promise<void> {
    const closeButton = this.selectors.modal?.closeButton;
    if (!closeButton) {
      return;
    }

    const button = this.page.locator(closeButton).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
    }
  }
}
