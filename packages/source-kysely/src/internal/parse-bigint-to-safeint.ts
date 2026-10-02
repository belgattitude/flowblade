import { isParsableSafeInt } from "@httpx/assert";

export const parseBigIntToSafeInt = (
  v: bigint | undefined
): number | undefined => {
  if (v === undefined) {
    return undefined;
  }
  const strV = v.toString(10);
  if (!isParsableSafeInt(strV)) {
    return undefined;
  }
  return Math.trunc(Number(strV));
};
