import type { PlaywrightTestConfig } from '@playwright/test';
import { PROJECTS } from './environments';

export const projects: PlaywrightTestConfig['projects'] = PROJECTS.map((meta) => ({
  name: meta.name,
  use: {
    baseURL: meta.baseURL
  },
  metadata: meta
}));
