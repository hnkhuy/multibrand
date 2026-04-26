import type { Locator, Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class AccountPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  locator(selector: string | undefined): Locator {
    return this.page.locator(selector ?? '').first();
  }

  get emailInput(): Locator {
    return this.locator(this.selectors.account.emailInput);
  }

  get passwordInput(): Locator {
    return this.locator(this.selectors.account.passwordInput);
  }

  get confirmPasswordInput(): Locator {
    return this.locator(this.selectors.account.confirmPasswordInput);
  }

  get firstNameInput(): Locator {
    return this.locator(this.selectors.account.firstNameInput);
  }

  get lastNameInput(): Locator {
    return this.locator(this.selectors.account.lastNameInput);
  }

  get signInTrigger(): Locator {
    return this.locator(this.selectors.account.signInTrigger);
  }

  get registerTrigger(): Locator {
    return this.locator(this.selectors.account.registerTrigger);
  }

  get logoutTrigger(): Locator {
    return this.locator(this.selectors.account.logoutTrigger);
  }

  get marketingCheckbox(): Locator {
    return this.locator(this.selectors.account.marketingCheckbox);
  }

  get authForms(): Locator {
    return this.page.locator(this.selectors.account.authForm ?? this.selectors.layout.form);
  }

  get authSubmit(): Locator {
    return this.locator(this.selectors.account.authSubmit);
  }

  get errorContainer(): Locator {
    return this.locator(this.selectors.account.errorContainer);
  }

  get requiredInvalidField(): Locator {
    return this.locator(this.selectors.account.requiredInvalidField);
  }

  get newsletterLink(): Locator {
    return this.locator(this.selectors.account.newsletterLink);
  }

  get passwordToggle(): Locator {
    return this.locator(this.selectors.account.passwordToggle);
  }
}
