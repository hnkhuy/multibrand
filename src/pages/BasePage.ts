import type { Locator, Page } from '@playwright/test';
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
    readonly ctx: BrandContext
  ) {
    this.header = new HeaderComponent(page, selectors);
    this.miniCart = new MiniCartComponent(page, selectors);
    this.cookieBanner = new CookieBannerComponent(page, selectors);
    this.modal = new ModalComponent(page, selectors);
  }

  get body(): Locator {
    return this.page.locator(this.selectors.layout.body).first();
  }

  get main(): Locator {
    return this.page.locator(this.selectors.layout.main).first();
  }

  get footer(): Locator {
    return this.page.locator(this.selectors.layout.footer).first();
  }

  get headerRoot(): Locator {
    return this.page.locator(this.selectors.layout.header).first();
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

  async readBodyText(): Promise<string> {
    return (await this.body.innerText().catch(() => '')) || '';
  }

  async readMainText(): Promise<string> {
    return (await this.main.textContent().catch(() => '')) || '';
  }
}
