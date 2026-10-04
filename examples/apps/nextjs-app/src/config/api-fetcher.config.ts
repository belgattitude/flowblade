import ky from "ky";

import { apiLocalConfig } from "@/config/api-local.config";

const kyPrefix = typeof window === "undefined" ? apiLocalConfig.apiUrl : "/api";

export const apiFetcherConfig = {
  timeout: 10_000,
  totalTimeout: 30_000,
};

export const apiFetcher = ky.create({
  prefix: kyPrefix,
  timeout: apiFetcherConfig.timeout,
  totalTimeout: apiFetcherConfig.totalTimeout,
  retry: {
    afterStatusCodes: [413, 429, 503],
    backoffLimit: Number.POSITIVE_INFINITY,
    delay: (attemptCount) => 0.3 * 2 ** (attemptCount - 1) * 1000,
    limit: 2,
    maxRetryAfter: Number.POSITIVE_INFINITY,
    methods: ["get", "put", "head", "delete", "options", "trace"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
});
