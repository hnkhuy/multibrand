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
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
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

  /**
   * Add a product to cart via the GRA GraphQL API, bypassing UI interactions.
   *
   * Calls the exact same two mutations the GRA frontend fires:
   *   1. createCart → cartId (guest cart tied to the current browser session)
   *   2. addConfigurableProductToCart (GRA custom → wraps standard Magento mutation)
   *
   * Runs inside page.evaluate so cookies/session are shared — navigating to /cart
   * afterwards will show the correct cart without extra session wiring.
   *
   * @param parentSku  Configurable product SKU (child_sku from dataLayer, e.g. "11838201.GCH")
   * @param childSku   Simple product SKU / entity-id (sku_by_size from dataLayer, e.g. "696327")
   * @param optionName Size attribute code (e.g. "size_uk", "size_eu", "size_cm")
   * @param optionValue Size value (e.g. "3", "36", "22")
   * @param qty        Quantity (default 1)
   * @returns          true if total_quantity > 0 after the call, false on any error
   */
  async addToCartViaApi(
    parentSku: string,
    childSku: string,
    optionName: string,
    optionValue: string,
    qty = 1
  ): Promise<boolean> {
    const graphqlUrl = this.ctx.baseURL.replace(/\/$/, '') + '/graphql';
    const store = this.ctx.region;

    // Step 1: Create a guest cart (runs in browser context → inherits PHPSESSID)
    const cartId = await this.page
      .evaluate(
        async ({ url, store }: { url: string; store: string }) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', store },
            body: JSON.stringify({
              operationName: 'createCart',
              variables: {},
              query: 'mutation createCart { cartId: createEmptyCart }',
            }),
          });
          const d = (await res.json()) as Record<string, unknown>;
          return ((d?.data as Record<string, unknown>)?.cartId as string) ?? null;
        },
        { url: graphqlUrl, store }
      )
      .catch(() => null);

    if (!cartId) return false;

    // Step 2: Add the configurable product using GRA's mutation signature
    const success = await this.page
      .evaluate(
        async ({
          url,
          store,
          cartId,
          parentSku,
          childSku,
          optionName,
          optionValue,
          qty,
        }: {
          url: string;
          store: string;
          cartId: string;
          parentSku: string;
          childSku: string;
          optionName: string;
          optionValue: string;
          qty: number;
        }) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', store },
            body: JSON.stringify({
              operationName: 'addConfigurableProductToCart',
              variables: {
                cartId,
                quantity: qty,
                sku: childSku,
                parentSku,
                option_name: optionName,
                option_value: optionValue,
              },
              // Minimal query — server doesn't need the full fragment chain we only
              // inspect total_quantity to confirm success.
              query: `mutation addConfigurableProductToCart(
                $cartId: String! $quantity: Float! $sku: String!
                $parentSku: String! $option_name: String! $option_value: String!
              ) {
                addConfigurableProductsToCart(input: {
                  cart_id: $cartId
                  cart_items: [{
                    data: {
                      quantity: $quantity
                      sku: $sku
                      custom_options_input: [{ option_name: $option_name option_value: $option_value }]
                    }
                    parent_sku: $parentSku
                  }]
                }) { cart { id total_quantity } }
              }`,
            }),
          });
          const d = (await res.json()) as Record<string, unknown>;
          const cart = (
            (d?.data as Record<string, unknown>)?.addConfigurableProductsToCart as Record<
              string,
              unknown
            >
          )?.cart as Record<string, unknown> | undefined;
          return ((cart?.total_quantity as number) ?? 0) > 0;
        },
        { url: graphqlUrl, store, cartId, parentSku, childSku, optionName, optionValue, qty }
      )
      .catch(() => false);

    return success;
  }
}
