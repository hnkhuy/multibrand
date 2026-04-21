import type { ModalSelectors } from '../../core/types';

export const modalSelectors: ModalSelectors = {
  container: '[role="dialog"], [data-testid="modal"], .modal',
  closeButton: '[aria-label*="close" i], [data-testid="modal-close"], button:has-text("Close")'
};
