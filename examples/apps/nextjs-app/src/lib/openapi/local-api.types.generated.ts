export interface paths {
  '/api/demo/duckdb/search': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Search */
    get: operations['getApiDemoDuckdbSearch'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: never;
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getApiDemoDuckdbSearch: {
    parameters: {
      query?: {
        name?: string;
        createdAt?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'text/plain': {
            meta: {
              count: number;
            };
            data: {
              productId: number;
              name: string;
              createdAt: string;
            }[];
            error?: string;
          };
        };
      };
    };
  };
}
