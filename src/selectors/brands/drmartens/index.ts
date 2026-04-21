import type { DeepPartial, Selectors } from '../../../core/types';
import { drmartensHeaderSelectors } from './header.sel';
import { drmartensPdpSelectors } from './pdp.sel';

export const drmartensSelectors: DeepPartial<Selectors> = {
  ...drmartensHeaderSelectors,
  ...drmartensPdpSelectors
};
