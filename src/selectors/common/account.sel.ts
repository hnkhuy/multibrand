import type { AccountSelectors } from '../../core/types';

export const accountSelectors: AccountSelectors = {
  emailInput: 'input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]',
  passwordInput:
    'input[type="password"][name*="pass" i], input[type="password"][id*="pass" i], input[type="password"][autocomplete="current-password"], input[type="password"]',
  confirmPasswordInput:
    'input[type="password"][name*="confirm" i], input[type="password"][id*="confirm" i], input[name*="confirmation" i], input[id*="confirmation" i]',
  firstNameInput: 'input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]',
  lastNameInput: 'input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]',
  signInTrigger:
    'button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Log In"), a:has-text("Log In"), button:has-text("Login"), a:has-text("Login"), button[type="submit"], [data-testid*="signin" i], [data-testid*="login" i]',
  registerTrigger:
    'a:has-text("Create"), a:has-text("Register"), a:has-text("Sign Up"), a:has-text("Join"), button:has-text("Create"), button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Join"), [href*="register"], [href*="create"], [href*="join"]',
  logoutTrigger:
    'a:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Log Out"), button:has-text("Sign Out"), button:has-text("Logout"), [href*="logout"], [href*="signout"]',
  marketingCheckbox:
    'input[type="checkbox"][name*="newsletter" i], input[type="checkbox"][id*="newsletter" i], input[type="checkbox"][name*="marketing" i], input[type="checkbox"][id*="marketing" i], label:has-text("Newsletter") input[type="checkbox"], label:has-text("Marketing") input[type="checkbox"]',
  authForm: 'form',
  authSubmit:
    'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Create"), button:has-text("Register"), button:has-text("Join"), button:has-text("Continue")',
  errorContainer: '[role="alert"], .message-error, .mage-error, .error, [id*="error" i], [class*="error" i]',
  requiredInvalidField: 'input:invalid[required], select:invalid[required], textarea:invalid[required]',
  newsletterLink: 'a[href*="newsletter"], a:has-text("Newsletter"), a:has-text("Communication"), [href*="account"]',
  passwordToggle:
    'button[aria-label*="show" i], button[aria-label*="hide" i], button:has-text("Show"), button:has-text("Hide"), [class*="password" i] button'
};
