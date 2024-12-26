import { bench, describe } from 'vitest';

describe(`Bootstrap`, async () => {
  bench('test nothing', () => {
    const _a = ['hello'].map((x) => x.toUpperCase());
  });
});
