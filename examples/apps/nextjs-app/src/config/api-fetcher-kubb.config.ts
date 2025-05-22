import type { SearchParamsOption } from 'ky';

import { apiFetcher } from './api-fetcher.config';

export type RequestConfig<TData = unknown> = {
  url?: string;
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE';
  params?: object;
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

const kubbApiFetcher = async <TData, TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>
): Promise<ResponseConfig<TData>> => {
  const { signal, headers, url = '', params } = config;
  const method = config.method.toUpperCase();

  const response = await apiFetcher(url, {
    prefixUrl: undefined,
    method,
    ...(params === undefined
      ? {}
      : { searchParams: params as unknown as SearchParamsOption }),
    ...(signal === undefined ? {} : { signal }),
    ...(headers === undefined ? {} : { headers }),
  });
  const data = await response.json<TData>();
  return {
    data,
    status: response.status,
    statusText: response.statusText,
  };
};

export default kubbApiFetcher;
