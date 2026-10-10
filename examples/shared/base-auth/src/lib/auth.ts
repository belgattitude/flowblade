import { createBetterAuth } from "../create-better-auth";
import { createDbBaseAuthConn } from "../create-db-base-auth-conn";

const jdbcDsn = process.env.DB_BASE_AUTH_JDBC_URL;
if (jdbcDsn === undefined) {
  throw new Error("Missing DB_BASE_AUTH_JDBC_URL environment variable");
}

export const auth = createBetterAuth({
  db: createDbBaseAuthConn({
    jdbcDsn,
  }),
});
