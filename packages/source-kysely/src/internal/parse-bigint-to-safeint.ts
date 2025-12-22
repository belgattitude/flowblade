import { isParsableSafeInt } from '@httpx/assert';

export const parseBigIntToSafeInt = (v: unknown): number | undefined => {
  if (v === undefined || typeof v !== 'bigint') {
    return undefined;
  }
  const strV = v.toString(10);
  if (!isParsableSafeInt(strV)) {
    return undefined;
  }
  return Number.parseInt(strV, 10);
};
