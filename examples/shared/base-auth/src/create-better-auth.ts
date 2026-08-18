import { apiKey } from '@better-auth/api-key';
import { sso } from '@better-auth/sso';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { jwt, openAPI } from 'better-auth/plugins';
import type { Kysely } from 'kysely';

import type { DBBaseAuth } from './db-base-auth-types';

type CreateBetterAuthParams = {
  db: Kysely<DBBaseAuth>;
  /**
   * @default base_auth
   */
  schema?: string;
  /**
   * @example
   * ```typescript
   *     socialProviders: {
   *       microsoft: {
   *         clientId: process.env.MICROSOFT_CLIENT_ID!,
   *         clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
   *         // Optional
   *         tenantId: 'common',
   *         prompt: 'select_account', // Forces account selection
   *       },
   *     },
   * ```
   */
  socialProviders?: BetterAuthOptions['socialProviders'];
  session?: BetterAuthOptions['session'];
  advanced?: BetterAuthOptions['advanced'];
};

export const createBetterAuth = (params: CreateBetterAuthParams) => {
  const { db, session, advanced, socialProviders } = params;
  return betterAuth({
    database: {
      db,
      type: 'mssql',
      casing: 'camel',
    },
    session,
    advanced,
    socialProviders,
    plugins: [nextCookies(), sso(), openAPI(), jwt(), apiKey()],
    // https://www.better-auth.com/docs/basic-usage
    emailAndPassword: {
      enabled: true,
      autoSignIn: true, // defaults to true
    },
    telemetry: {
      enabled: false,
    },
  });
};
