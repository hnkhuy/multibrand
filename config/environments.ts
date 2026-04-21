import type { Brand, ProjectMeta, Region } from '../src/core/types';
import { getEnv } from '../src/core/env';

const defaultBaseUrls: Record<Brand, Record<Region, string>> = {
  drmartens: {
    au: 'https://stag-drmartens-au.accentgra.com/',
    nz: 'https://stag-drmartens-nz.accentgra.com/'
  },
  platypus: {
    au: 'https://stag-platypus-au.accentgra.com/',
    nz: 'https://stag-platypus-nz.accentgra.com/'
  },
  skechers: {
    au: 'https://stag-skechers-au.accentgra.com/',
    nz: 'https://stag-skechers-nz.accentgra.com/'
  },
  vans: {
    au: 'https://stag-vans-au.accentgra.com/',
    nz: 'https://stag-vans-nz.accentgra.com/'
  }
};

export const PROJECTS: ProjectMeta[] = [
  createProjectMeta('drmartens', 'au'),
  createProjectMeta('drmartens', 'nz'),
  createProjectMeta('platypus', 'au'),
  createProjectMeta('platypus', 'nz'),
  createProjectMeta('skechers', 'au'),
  createProjectMeta('skechers', 'nz'),
  createProjectMeta('vans', 'au'),
  createProjectMeta('vans', 'nz')
];

export function getBaseURL(brand: Brand, region: Region): string {
  const key = `${brand}_${region}_url`.toUpperCase();
  return getEnv(key, defaultBaseUrls[brand][region]);
}

export function createProjectMeta(brand: Brand, region: Region): ProjectMeta {
  return {
    name: `${brand}-${region}`,
    brand,
    region,
    baseURL: getBaseURL(brand, region)
  };
}
