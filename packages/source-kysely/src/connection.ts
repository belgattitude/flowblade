import { MssqlDialect } from "kysely";
import * as tarn from 'tarn';
import * as tedious from 'tedious';

export const createDialect = (tediousConfig: tedious.ConnectionConfiguration) => {
    return new MssqlDialect({
        tarn: {
            ...tarn,
            options: {
                min: 0,
                max: 10,
            },
        },
        tedious: {
            ...tedious,
            connectionFactory: () => {
                return new tedious.Connection(tediousConfig);
            },
        },
    });
};