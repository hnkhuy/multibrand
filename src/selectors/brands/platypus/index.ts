import type { DeepPartial, Selectors } from '../../../core/types';
import { platypusHeaderSelectors } from './header.sel';

export const platypusSelectors: DeepPartial<Selectors> = {
  ...platypusHeaderSelectors
};
