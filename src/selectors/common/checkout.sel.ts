import type { CheckoutSelectors } from '../../core/types';

export const checkoutSelectors: CheckoutSelectors = {
  emailInput: 'input[type="email"], input[name="email"]',
  continueButton: 'button:has-text("Continue"), button[type="submit"]',
  placeOrderButton: 'button:has-text("Place Order"), button:has-text("Pay Now")'
};
