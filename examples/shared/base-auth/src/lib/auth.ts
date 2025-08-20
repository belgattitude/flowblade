import { createBetterAuth } from '../create-better-auth';
import { createDbBaseAuthConn } from '../create-db-base-auth-conn';

export const auth = createBetterAuth({
  db: createDbBaseAuthConn({
    jdbcDsn: process.env.DB_BASE_AUTH_JDBC_URL!,
  }),
});
