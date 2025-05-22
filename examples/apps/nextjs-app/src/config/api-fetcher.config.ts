import ky from 'ky';

import { apiLocalConfig } from '@/config/api-local.config';

const prefixUrl =
  typeof window === 'undefined' ? apiLocalConfig.apiUrl : '/api';

export const apiFetcher = ky.create({
  prefixUrl,
  retry: {
    limit: 2,
    methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
    afterStatusCodes: [413, 429, 503],
    maxRetryAfter: Number.POSITIVE_INFINITY,
    backoffLimit: Number.POSITIVE_INFINITY,
    delay: (attemptCount) => 0.3 * 2 ** (attemptCount - 1) * 1000,
  },
});
