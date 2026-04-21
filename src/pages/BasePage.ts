import type { Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { waitForPageReady } from '../core/wait';
import { CookieBannerComponent } from '../components/CookieBanner.component';
import { HeaderComponent } from '../components/Header.component';
import { MiniCartComponent } from '../components/MiniCart.component';
import { ModalComponent } from '../components/Modal.component';

export abstract class BasePage {
  readonly header: HeaderComponent;
  readonly miniCart: MiniCartComponent;
  readonly cookieBanner: CookieBannerComponent;
  readonly modal: ModalComponent;

  protected constructor(
    protected readonly page: Page,
    protected readonly selectors: Selectors,
    protected readonly ctx: BrandContext
  ) {
    this.header = new HeaderComponent(page, selectors);
    this.miniCart = new MiniCartComponent(page, selectors);
    this.cookieBanner = new CookieBannerComponent(page, selectors);
    this.modal = new ModalComponent(page, selectors);
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await waitForPageReady(this.page);
    await this.dismissInterruptions();
  }

  async dismissInterruptions(): Promise<void> {
    await this.cookieBanner.acceptIfVisible();
    await this.modal.closeIfVisible();
  }
}
