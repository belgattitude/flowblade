import { convertJdbcToDsn, parseDsnOrThrow } from '@httpx/dsn-parser';
import type { ConnectionConfiguration as TediousConnectionConfig } from 'tedious';
import * as v from 'valibot';

type AuthConnectionOptions = NonNullable<
  TediousConnectionConfig['authentication']
>['options'];

const tediousSchema = v.object({
  database: v.string(),
  authentication: v.optional(
    /**
     * Different options for authentication types:
     *
     * `default`: [[DefaultAuthentication.options]]
     * `ntlm` :[[NtlmAuthentication]]
     * `token-credential`: [[CredentialChainAuthentication.options]]
     * `azure-active-directory-password` : [[AzureActiveDirectoryPasswordAuthentication.options]]
     * `azure-active-directory-access-token` : [[AzureActiveDirectoryAccessTokenAuthentication.options]]
     * `azure-active-directory-msi-vm` : [[AzureActiveDirectoryMsiVmAuthentication.options]]
     * `azure-active-directory-msi-app-service` : [[AzureActiveDirectoryMsiAppServiceAuthentication.options]]
     * `azure-active-directory-service-principal-secret` : [[AzureActiveDirectoryServicePrincipalSecret.options]]
     * `azure-active-directory-default` : [[AzureActiveDirectoryDefaultAuthentication.options]]
     */
    v.union([
      v.literal('default'),
      v.literal('ntlm'),
      v.literal('token-credential'),
      v.literal('azure-active-directory-default'),
      v.literal('azure-active-directory-password'),
      v.literal('azure-active-directory-access-token'),
      v.literal('azure-active-directory-msi-vm'),
      v.literal('azure-active-directory-msi-app-service'),
      v.literal('azure-active-directory-service-principal-secret'),
      v.literal('azure-active-directory-default'),
    ]),
    'default'
  ),
  user: v.optional(v.string()),
  password: v.optional(v.string()),
  trustServerCertificate: v.optional(v.boolean(), false),
  clientId: v.optional(v.string()),
  useUtc: v.optional(
    v.boolean('Use UTC time zone for dates (default: true)'),
    true
  ),
  encrypt: v.optional(v.boolean(), true),
  connectTimeout: v.optional(v.number('Number in milliseconds.')),
  requestTimeout: v.optional(v.number('Request timeout in milliseconds')),
});

export const TediousConnUtils = {
  /**
   * Parse and validate a JDBC connection string and return a Tedious connection configuration.
   *
   * @example
   * ```typescript
   * const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
   * const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
   * const tediousConnection = new Tedious.Connection(tediousConfig);
   * ```
   * @throw TypeError if dsn isn't valid
   */
  fromJdbcDsn: (jdbcUrl: string): TediousConnectionConfig => {
    const dsn = convertJdbcToDsn(jdbcUrl);
    const parsed = parseDsnOrThrow(dsn);
    const params = v.parse(tediousSchema, parsed.params);
    const {
      authentication,
      database,
      useUtc,
      encrypt,
      connectTimeout,
      trustServerCertificate,
      clientId,
      user,
      password,
      requestTimeout,
    } = params;
    let authConnOptions: AuthConnectionOptions;
    switch (authentication) {
      case 'default':
        authConnOptions = {
          userName: user,
          password: password,
        };
        break;
      case 'azure-active-directory-default':
      case 'azure-active-directory-msi-app-service':
        authConnOptions = {
          clientId: clientId,
        };
        break;
      default:
        throw new Error(`Unsupported authentication type: ${authentication}`);
    }
    return {
      server: parsed.host,
      authentication: {
        type: authentication,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        options: authConnOptions,
      },
      options: {
        database: database,
        port: parsed.port,
        useUTC: useUtc,
        encrypt: encrypt,
        trustServerCertificate,
        ...(requestTimeout ? { requestTimeout } : {}),
        ...(connectTimeout ? { connectTimeout } : {}),
      },
    };
  },
};
