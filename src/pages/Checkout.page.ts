import type { Locator, Page } from '@playwright/test';
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

  locator(selector: string | undefined): Locator {
    return this.page.locator(selector ?? '').first();
  }

  get root(): Locator {
    return this.locator(this.selectors.checkout?.root);
  }

  get orderSummary(): Locator {
    return this.locator(this.selectors.checkout?.orderSummary);
  }

  get orderSummaryEntry(): Locator {
    return this.locator(this.selectors.checkout?.orderSummaryEntry);
  }

  get emailInput(): Locator {
    return this.locator(this.selectors.checkout?.emailInput);
  }

  get passwordInput(): Locator {
    return this.locator(this.selectors.checkout?.passwordInput);
  }

  get returningCustomer(): Locator {
    return this.locator(this.selectors.checkout?.returningCustomer);
  }

  get shippingForm(): Locator {
    return this.locator(this.selectors.checkout?.shippingForm);
  }

  get shippingField(): Locator {
    return this.locator(this.selectors.checkout?.shippingField);
  }

  get firstName(): Locator {
    return this.locator(this.selectors.checkout?.firstName);
  }

  get lastName(): Locator {
    return this.locator(this.selectors.checkout?.lastName);
  }

  get city(): Locator {
    return this.locator(this.selectors.checkout?.city);
  }

  get state(): Locator {
    return this.locator(this.selectors.checkout?.state);
  }

  get postcode(): Locator {
    return this.locator(this.selectors.checkout?.postcode);
  }

  get phone(): Locator {
    return this.locator(this.selectors.checkout?.phone);
  }

  get country(): Locator {
    return this.locator(this.selectors.checkout?.country);
  }

  get continueButton(): Locator {
    return this.locator(this.selectors.checkout?.continueButton);
  }

  get deliveryMethod(): Locator {
    return this.locator(this.selectors.checkout?.deliveryMethod);
  }

  get loginSubmit(): Locator {
    return this.locator(this.selectors.checkout?.loginSubmit);
  }

  get cartItem(): Locator {
    return this.locator(this.selectors.checkout?.cartItem);
  }

  get addressAutocompleteSuggestion(): Locator {
    return this.locator(this.selectors.checkout?.addressAutocompleteSuggestion);
  }

  get manualAddressEntry(): Locator {
    return this.locator(this.selectors.checkout?.manualAddressEntry);
  }

  get savedAddress(): Locator {
    return this.locator(this.selectors.checkout?.savedAddress);
  }

  get newAddressTrigger(): Locator {
    return this.locator(this.selectors.checkout?.newAddressTrigger);
  }

  get deliveryMethodOption(): Locator {
    return this.locator(this.selectors.checkout?.deliveryMethodOption);
  }

  get pickupOption(): Locator {
    return this.locator(this.selectors.checkout?.pickupOption);
  }

  get storeSearch(): Locator {
    return this.locator(this.selectors.checkout?.storeSearch);
  }

  get storeResult(): Locator {
    return this.locator(this.selectors.checkout?.storeResult);
  }

  get selectStoreButton(): Locator {
    return this.locator(this.selectors.checkout?.selectStoreButton);
  }

  get checkedDeliveryMethod(): Locator {
    return this.locator(this.selectors.checkout?.checkedDeliveryMethod);
  }

  get disabledDeliveryMethod(): Locator {
    return this.locator(this.selectors.checkout?.disabledDeliveryMethod);
  }

  get requiredInvalidField(): Locator {
    return this.locator(this.selectors.checkout?.requiredInvalidField);
  }
}
