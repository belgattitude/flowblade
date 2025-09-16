import { isPlainObject } from '@httpx/plain-object';

import { apiFetcher } from '@/config/api-fetcher.config.ts';
import { apiLocalConfig } from '@/config/api-local.config.ts';

export type RequestConfig<TData = unknown> = {
  url?: string;
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  data?: TData | FormData;
  responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'document'
    | 'json'
    | 'text'
    | 'stream';
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
};

export type ResponseErrorConfig<TError = unknown> = TError;

const isBrowser = globalThis.window !== undefined;

const getIsomorphicUrl = (url: string): string => {
  if (isBrowser) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${apiLocalConfig.baseUrl}${url}`;
};
const kubbApiFetcher = async <TData, TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>
): Promise<ResponseConfig<TData>> => {
  const {
    signal,
    headers,
    url = '',
    params: searchParams = {},
    data: formData,
  } = config;
  const method = config.method.toUpperCase();
  const mutationMethods = ['POST', 'PUT', 'PATCH'];

  const isFormData =
    formData instanceof FormData && mutationMethods.includes(method);

  const isJsonData =
    !isFormData &&
    mutationMethods.includes(method) &&
    (Array.isArray(formData) || isPlainObject(formData));

  const safeHeaders = isFormData
    ? {
        ...headers,
        // Hack for ky, that doesn't support setting Content-Type when using FormData
        'Content-Type': undefined,
      }
    : {
        ...headers,
      };
  const response = await apiFetcher(getIsomorphicUrl(url), {
    prefixUrl: undefined,
    method,
    timeout: 90_000,
    credentials: 'same-origin',
    searchParams,
    ...(isJsonData ? { json: formData } : {}),
    ...(formData instanceof FormData ? { body: formData } : {}),
    ...(signal === undefined ? {} : { signal }),
    ...(safeHeaders === undefined ? {} : { headers: safeHeaders }),
  });

  const data = await response.json<TData>();

  return {
    data,
    status: response.status,
    statusText: response.statusText,
  };
};

export default kubbApiFetcher;
