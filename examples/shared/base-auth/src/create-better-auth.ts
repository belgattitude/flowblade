import { sso } from '@better-auth/sso';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { apiKey, jwt, openAPI } from 'better-auth/plugins';
import type { Kysely } from 'kysely';

import type { DBBaseAuth } from './db-base-auth-types';

type CreateBetterAuthParams = {
  db: Kysely<DBBaseAuth>;
  /**
   * @default base_auth
   */
  schema?: string;
};

export const createBetterAuth = (params: CreateBetterAuthParams) => {
  const { db } = params;
  return betterAuth({
    database: {
      db,
      type: 'mssql',
      casing: 'camel',
    },
    plugins: [nextCookies(), sso(), openAPI(), jwt(), apiKey()],
    // https://www.better-auth.com/docs/basic-usage
    emailAndPassword: {
      enabled: true,
      autoSignIn: true, // defaults to true
    },
    socialProviders: {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        // Optional
        tenantId: 'common',
        prompt: 'select_account', // Forces account selection
      },
    },
    telemetry: {
      enabled: false,
    },
  });
};
