import type { Brand } from '../src/core/types';
import { getEnv } from '../src/core/env';

export interface SearchTestData {
  keyword: string;
}

export const searchData: Record<Brand, SearchTestData> = {
  drmartens: { keyword: 'boots' },
  platypus: { keyword: 'sneakers' },
  skechers: { keyword: 'shoes' },
  vans: { keyword: 'old skool' }
};

export const plpPaths: Record<Brand, string> = {
  drmartens: '/shop/sale',
  platypus: '/shop/womens',
  skechers: '/shop/women',
  vans: '/shop/womens'
};

export const checkoutData = {
  email: 'automation@example.com'
};

export interface LoginCredential {
  email: string;
  password: string;
}

const defaultSharedAccount: LoginCredential = {
  email: 'jeff.huynh+9@accentgr.com.au',
  password: 'G92YMsCPwwvvXW8'
};

export const accountData = {
  shared: {
    email: getEnv('TEST_ACCOUNT_EMAIL', defaultSharedAccount.email),
    password: getEnv('TEST_ACCOUNT_PASSWORD', defaultSharedAccount.password)
  },
  invalidPassword: `${defaultSharedAccount.password}invalid`,
  unregisteredEmail: `automation-unregistered-${Date.now()}@example.com`
};
