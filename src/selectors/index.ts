import deepmerge from 'deepmerge';
import type { Brand, DeepPartial, SelectorFactory, Selectors } from '../core/types';
import { commonSelectors } from './common';
import { drmartensSelectors } from './brands/drmartens';
import { platypusSelectors } from './brands/platypus';
import { skechersSelectors } from './brands/skechers';
import { vansSelectors } from './brands/vans';

const brandOverrides: Record<Brand, DeepPartial<Selectors>> = {
  drmartens: drmartensSelectors,
  platypus: platypusSelectors,
  skechers: skechersSelectors,
  vans: vansSelectors
};

export function buildSelectors(brand: Brand): Selectors {
  return deepmerge(commonSelectors, brandOverrides[brand] ?? {}) as Selectors;
}

export const selectorFactory: SelectorFactory = {
  buildSelectors
};
