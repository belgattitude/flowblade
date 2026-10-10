import {
  createHttpException,
  type HttpExceptionParams,
} from "@httpx/exception";
import { HTTPError } from "ky";

import { apiFetcherConfig, apiFetcher } from "@/config/api-fetcher.config.ts";
import { apiLocalConfig } from "@/config/api-local.config.ts";

const isBrowser = globalThis.window !== undefined;

const getIsomorphicUrl = (url: string): string => {
  if (isBrowser) {
    return url;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${apiLocalConfig.baseUrl}${url}`;
};

const parseKyResponseByContentType = async <T>(
  response: Response
): Promise<T> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  if (
    contentType === "" ||
    contentType.includes("text/") ||
    contentType.includes("csv")
  ) {
    return (await response.text()) as T;
  }
  return (await response.blob()) as T;
};

const throwAsHttpException = (error: unknown, method: string): never => {
  if (error instanceof HTTPError) {
    const { response } = error;
    // ky pre-parses the error body into `error.data` and consumes the response
    // stream doing so, so `response.json()` no longer works — read the parsed
    // body from `data` instead (for JSON responses this is the server object).
    const data: unknown = error.data;
    const errorBody =
      data !== null && typeof data === "object"
        ? (data as { error?: string; message?: string })
        : {};
    const fallback =
      response.statusText.trim() === ""
        ? `Request failed with status ${response.status}`
        : response.statusText;
    throw createHttpException(response.status, {
      method: method.toUpperCase() as HttpExceptionParams["method"],
      message: errorBody.message ?? errorBody.error ?? fallback,
      url: response.url,
    });
  }
  throw error;
};

export const orvalApiFetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const { method = "GET", body, signal } = options;
  const headers = options.headers as
    | Record<string, string | undefined>
    | undefined;

  const isFormData = body instanceof FormData;

  const safeHeaders = isFormData
    ? {
        ...headers,
        // Hack for ky, that doesn't support setting Content-Type when using FormData
        "Content-Type": undefined,
      }
    : { ...headers };

  try {
    const response = await apiFetcher(getIsomorphicUrl(url), {
      prefix: undefined,
      method: method.toUpperCase(),
      timeout: apiFetcherConfig.timeout,
      totalTimeout: apiFetcherConfig.totalTimeout,
      credentials: "same-origin",
      ...(body === null || body === undefined ? {} : { body }),
      ...(signal === null || signal === undefined ? {} : { signal }),
      headers: safeHeaders,
    });
    return await parseKyResponseByContentType<T>(response);
  } catch (error) {
    return throwAsHttpException(error, method);
  }
};

export default orvalApiFetcher;
