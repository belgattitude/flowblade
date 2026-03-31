import { parseDuckDSNZod } from './parse-duck-dsn-zod.ts';

export const isParsableDuckDsnZod = (dsn: unknown): boolean => {
  if (typeof dsn !== 'string') return false;
  try {
    parseDuckDSNZod(dsn);
    return true;
  } catch {
    return false;
  }
};
