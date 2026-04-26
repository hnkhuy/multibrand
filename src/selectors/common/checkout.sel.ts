import type { CheckoutSelectors } from '../../core/types';

export const checkoutSelectors: CheckoutSelectors = {
  root: 'main, [role="main"], form',
  headerLogo: 'header [data-testid*="logo" i], header a[aria-label*="logo" i], header a[href="/"], [class*="checkout-header" i]',
  orderSummary: '[data-testid*="order-summary" i], [class*="order-summary" i], [id*="order-summary" i], [data-testid*="cart-summary" i]',
  orderSummaryEntry:
    '[data-testid*="order-summary" i], [class*="order-summary" i], [id*="order-summary" i], [data-testid*="cart-summary" i], button:has-text("Order Summary"), button:has-text("Show order summary"), details:has-text("Order Summary"), a[href*="cart"], a[href*="bag"]',
  emailInput: 'input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]',
  returningCustomer:
    'a[href*="login"], a[href*="sign-in"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), a:has-text("Returning"), button:has-text("Returning")',
  shippingForm: 'form:has(input[name*="address" i]), [data-testid*="shipping" i], [class*="shipping-address" i]',
  shippingField: 'input[name*="address" i], input[id*="address" i], input[autocomplete*="address-line1"], input[name*="street" i]',
  firstName: 'input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]',
  lastName: 'input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]',
  city: 'input[name*="city" i], input[id*="city" i], input[name*="suburb" i], input[id*="suburb" i]',
  state: 'select[name*="state" i], input[name*="state" i], select[id*="state" i], input[id*="state" i]',
  postcode:
    'input[name*="postcode" i], input[id*="postcode" i], input[name*="zip" i], input[id*="zip" i], input[name*="postal" i], input[id*="postal" i]',
  phone: 'input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[autocomplete="tel"]',
  country: 'select[name*="country" i], select[id*="country" i]',
  continueButton: 'button[type="submit"], button:has-text("Continue"), button:has-text("Next"), button:has-text("Proceed"), button:has-text("Ship")',
  deliveryMethod:
    '[data-testid*="delivery" i], [class*="delivery-method" i], [class*="shipping-method" i], input[name*="shipping" i], input[name*="delivery" i], button:has-text("Standard"), button:has-text("Express"), button:has-text("Click & Collect")',
  loginSubmit: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), button:has-text("Continue")',
  passwordInput: 'input[type="password"], input[name*="password" i], input[id*="password" i]',
  cartItem: '[data-testid*="cart-item" i], [class*="cart-item" i], [class*="minicart-item" i], [data-product-id]',
  addressAutocompleteSuggestion:
    '[role="listbox"] [role="option"], [class*="autocomplete" i] [class*="option" i], [class*="suggest" i] li, [data-testid*="address-suggestion" i]',
  manualAddressEntry:
    'button:has-text("Manual"), button:has-text("Enter address manually"), a:has-text("Manual"), a:has-text("Enter address manually"), button:has-text("Can\'t find address"), a:has-text("Can\'t find address")',
  savedAddress: '[data-testid*="saved-address" i], [class*="saved-address" i], select[name*="address" i], select[id*="address" i], [name*="address_id" i]',
  newAddressTrigger:
    'button:has-text("Add New Address"), button:has-text("New Address"), a:has-text("Add New Address"), a:has-text("New Address"), button:has-text("Add Address"), a:has-text("Add Address")',
  deliveryMethodOption:
    'input[type="radio"][name*="shipping" i], input[type="radio"][name*="delivery" i], [data-testid*="delivery-option" i], [class*="delivery-option" i], [class*="shipping-option" i]',
  pickupOption:
    'input[type="radio"][value*="pickup" i], input[type="radio"][value*="collect" i], button:has-text("Click & Collect"), button:has-text("Pick up"), [data-testid*="pickup" i], [class*="pickup" i], [class*="collect" i]',
  storeSearch:
    'input[placeholder*="suburb" i], input[placeholder*="postcode" i], input[name*="store" i], input[id*="store" i], input[placeholder*="store" i]',
  storeResult: '[data-testid*="store-result" i], [class*="store-result" i], [class*="pickup-store" i], [class*="store-card" i]',
  selectStoreButton: 'button:has-text("Select Store"), button:has-text("Choose Store"), button:has-text("Select"), [data-testid*="select-store" i]',
  checkedDeliveryMethod:
    'input[type="radio"][name*="shipping" i]:checked, input[type="radio"][name*="delivery" i]:checked',
  disabledDeliveryMethod:
    'input[type="radio"][disabled][name*="shipping" i], input[type="radio"][disabled][name*="delivery" i]',
  requiredInvalidField: 'input:invalid[required], select:invalid[required], textarea:invalid[required]',
  placeOrderButton: 'button:has-text("Place Order"), button:has-text("Pay Now")'
};
