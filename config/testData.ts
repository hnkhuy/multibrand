import type { Brand } from '../src/core/types';

export interface SearchTestData {
  keyword: string;
}

export const searchData: Record<Brand, SearchTestData> = {
  drmartens: { keyword: 'boots' },
  platypus: { keyword: 'sneakers' },
  skechers: { keyword: 'shoes' },
  vans: { keyword: 'old skool' }
};

export const checkoutData = {
  email: 'automation@example.com'
};
