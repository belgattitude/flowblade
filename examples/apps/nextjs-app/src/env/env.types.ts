import type { clientEnv } from './client.env.mjs';
import type { serverEnv } from './server.env.mjs';

export type ServerEnv = typeof serverEnv;
export type ClientEnv = typeof clientEnv;
