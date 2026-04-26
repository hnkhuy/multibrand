import deepmerge from 'deepmerge';
import type { Brand, DeepPartial, SelectorFactory, Selectors } from '../core/types';
import { drmartensHeaderSelectors } from './brands/drmartens/header.sel';
import { drmartensPdpSelectors } from './brands/drmartens/pdp.sel';
import { platypusHeaderSelectors } from './brands/platypus/header.sel';
import { skechersPlpSelectors } from './brands/skechers/plp.sel';
import { COMMON_SELECTORS } from './common';

const BRAND_OVERRIDES: Record<Brand, DeepPartial<Selectors>> = {
  drmartens: {
    header: drmartensHeaderSelectors,
    pdp: drmartensPdpSelectors
  },
  platypus: {
    header: platypusHeaderSelectors
  },
  skechers: {
    plp: skechersPlpSelectors
  },
  vans: {}
};

export function buildSelectors(brand: Brand): Selectors {
  return deepmerge(COMMON_SELECTORS, BRAND_OVERRIDES[brand] ?? {}) as Selectors;
}

export const selectorFactory: SelectorFactory = {
  buildSelectors
};
