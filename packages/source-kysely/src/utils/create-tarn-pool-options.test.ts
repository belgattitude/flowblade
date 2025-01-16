import { expect } from 'vitest';

import { createTarnPoolOptions } from './create-tarn-pool-options';

describe('createTarnPoolOptions', () => {
  it('should return the defaults', () => {
    const options = createTarnPoolOptions({});
    expect(options).toStrictEqual({
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30_000,
      createRetryIntervalMillis: 200,
      createTimeoutMillis: 30_000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30_000,
      reapIntervalMillis: 1000,
      propagateCreateError: false,
    });
  });
  it('should override the defaults', () => {
    const options = createTarnPoolOptions({
      min: 1,
      max: 20,
      acquireTimeoutMillis: 60_000,
    });
    expect(options).toStrictEqual({
      min: 1,
      max: 20,
      acquireTimeoutMillis: 60_000,
      createRetryIntervalMillis: 200,
      createTimeoutMillis: 30_000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30_000,
      reapIntervalMillis: 1000,
      propagateCreateError: false,
    });
  });
});
