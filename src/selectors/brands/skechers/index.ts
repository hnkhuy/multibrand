import type { DeepPartial, Selectors } from '../../../core/types';
import { skechersPlpSelectors } from './plp.sel';

export const skechersSelectors: DeepPartial<Selectors> = {
  ...skechersPlpSelectors
};
