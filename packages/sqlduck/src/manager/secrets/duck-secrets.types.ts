/** Value of a secret option, bound as a query parameter (never inlined). */
export type DuckSecretOptionValue = string | number | boolean;

type SecretCommon = {
  /** Secret name, a plain identifier (letters, digits and underscores). */
  name: string;
  /**
   * Path prefix(es) the secret applies to, ie: `az://exports/`. Defaults to
   * every path of the secret type. DuckDB picks the secret with the longest
   * matching scope.
   */
  scope?: string | readonly string[];
  /**
   * Additional options of the secret type or provider that are not typed
   * here. Keys are converted from camelCase to DuckDB's SNAKE_CASE.
   *
   * @example
   * ```typescript
   * await secrets.create({
   *   name: "exports_s3",
   *   type: "s3",
   *   keyId: "key",
   *   secret: "secret",
   *   // KMS_KEY_ID in DuckDB
   *   options: { kmsKeyId: "arn:aws:kms:eu-west-1:123:key/abc" },
   * });
   * ```
   */
  options?: Record<string, DuckSecretOptionValue>;
};

type AzureSecretOptions =
  | {
      provider?: "config";
      connectionString: string;
    }
  | {
      /** Anonymous access to a public storage account. */
      provider?: "config";
      accountName: string;
    }
  | {
      /** Credentials from the environment: managed identity, cli, env... */
      provider: "credential_chain";
      accountName: string;
      /** Ordered `;` separated chain, ie: `managed_identity;cli;env` */
      chain?: string;
    }
  | {
      provider: "service_principal";
      accountName: string;
      tenantId: string;
      clientId: string;
      clientSecret?: string;
      clientCertificatePath?: string;
    };

type S3SecretOptions =
  | {
      provider?: "config";
      keyId: string;
      secret: string;
      sessionToken?: string;
      region?: string;
      endpoint?: string;
      urlStyle?: "vhost" | "path";
      useSsl?: boolean;
      /** Cloudflare R2 account, for secrets of type `r2`. */
      accountId?: string;
    }
  | {
      /** Credentials from the environment: instance role, sso, env... */
      provider: "credential_chain";
      /** Ordered `;` separated chain, ie: `env;config` */
      chain?: string;
      region?: string;
      endpoint?: string;
    };

type HttpSecretOptions = {
  provider?: "config";
  bearerToken?: string;
  httpProxy?: string;
  httpProxyUsername?: string;
  httpProxyPassword?: string;
};

/**
 * Azure Blob Storage / Data Lake secret.
 *
 * @example
 * ```typescript
 * const withConnectionString: DuckAzureSecret = {
 *   name: "exports_azure",
 *   type: "azure",
 *   connectionString: "DefaultEndpointsProtocol=https;AccountName=...",
 *   scope: "az://exports/",
 * };
 *
 * const withServicePrincipal: DuckAzureSecret = {
 *   name: "lake_azure",
 *   type: "azure",
 *   provider: "service_principal",
 *   accountName: "mylake",
 *   tenantId: "tenant-id",
 *   clientId: "client-id",
 *   clientSecret: "client-secret",
 * };
 * ```
 */
export type DuckAzureSecret = SecretCommon & {
  type: "azure";
} & AzureSecretOptions;

/**
 * S3, Cloudflare R2 or Google Cloud Storage (HMAC keys) secret.
 *
 * @example
 * ```typescript
 * const s3: DuckS3Secret = {
 *   name: "exports_s3",
 *   type: "s3",
 *   keyId: "access-key-id",
 *   secret: "secret-access-key",
 *   region: "eu-west-1",
 *   scope: "s3://exports/",
 * };
 *
 * const r2: DuckS3Secret = {
 *   name: "exports_r2",
 *   type: "r2",
 *   keyId: "access-key-id",
 *   secret: "secret-access-key",
 *   accountId: "cloudflare-account-id",
 * };
 * ```
 */
export type DuckS3Secret = SecretCommon & {
  type: "s3" | "r2" | "gcs";
} & S3SecretOptions;

/**
 * Http secret: bearer token or proxy used for http(s) urls.
 *
 * @example
 * ```typescript
 * const api: DuckHttpSecret = {
 *   name: "api_token",
 *   type: "http",
 *   bearerToken: "token",
 *   scope: "https://api.example.com/",
 * };
 * ```
 */
export type DuckHttpSecret = SecretCommon & {
  type: "http";
} & HttpSecretOptions;

/**
 * A secret type that is not typed here: its options are given in `options`.
 *
 * @example
 * ```typescript
 * const huggingface: DuckCustomSecret = {
 *   name: "hf",
 *   type: "custom",
 *   customType: "huggingface",
 *   options: { token: "hf_token" },
 * };
 * ```
 */
export type DuckCustomSecret = SecretCommon & {
  type: "custom";
  /** DuckDB secret type, ie: `huggingface`. */
  customType: string;
  provider?: string;
};

export type DuckSecret =
  | DuckAzureSecret
  | DuckS3Secret
  | DuckHttpSecret
  | DuckCustomSecret;

export type CreateSecretParams = {
  /**
   * Persist the secret (unencrypted) in DuckDB's secret directory so it is
   * restored when a database is opened again. Temporary by default: the
   * secret lives in memory, for the lifetime of the DuckDB instance.
   * @default false
   */
  persistent?: boolean;
  /**
   * What to do when a secret with the same name exists.
   *
   * @example
   * ```typescript
   * await secrets.create(secret, { onConflict: "replace" });
   * ```
   *
   * @default "error"
   */
  onConflict?: "error" | "replace" | "ignore";
};

/** A secret as listed by DuckDB, sensitive values are redacted. */
export type DuckSecretInfo = {
  name: string;
  type: string;
  provider: string;
  persistent: boolean;
  storage: string;
  scope: string[];
  /** Options of the secret, sensitive values are replaced by `redacted`. */
  secretString: string;
};
