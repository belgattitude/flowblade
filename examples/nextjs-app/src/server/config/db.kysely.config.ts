import {Kysely} from "kysely";
import {ConnectionUtils, createDialect} from "@flowblade/source-kysely";

const config = ConnectionUtils.jdbcToTediousConfig(process.env.DB_FLOWBLADE_AZURE_SQL_EDGE)
const dialect = createDialect(config);

console.log(config);

const maskPII = (param: unknown) => {
    // @todo filter out personal identifiable information
    return param;
};

export const dbKysely = new Kysely<unknown>({
    dialect,
    // @todo decide if we want to move it to query executor instead.
    log: (event) => {
        if (event.level === 'error') {
            console.error('Query failed :', {
                durationMs: event.queryDurationMillis,
                error: event.error,
                sql: event.query.sql,
                params: event.query.parameters.map((param) => maskPII(param)),
            });
        } else {
            console.log('Query executed :', {
                durationMs: event.queryDurationMillis,
                sql: event.query.sql,
                params: event.query.parameters.map((param) => maskPII(param)),
            });
        }
    },
});