import dotenv from 'dotenv';

dotenv.config();

export interface RuntimeEnv {
  CI: boolean;
  RUN_LIVE_TESTS: boolean;
}

function asBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env: RuntimeEnv = {
  CI: asBoolean(process.env.CI),
  RUN_LIVE_TESTS: asBoolean(process.env.RUN_LIVE_TESTS)
};
