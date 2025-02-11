import { MIntl } from '@httpx/memo-intl';

export const formatTimeMsToSeconds = (timeMs: number) => {
  const formatter = MIntl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(timeMs / 1000);
};
