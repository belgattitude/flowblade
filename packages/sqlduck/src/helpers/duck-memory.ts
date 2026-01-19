import type { DuckDBConnection } from '@duckdb/node-api';

import { DuckExec } from './duck-exec';

export const duckMemoryTags = [
  'BASE_TABLE',
  'HASH_TABLE',
  'PARQUET_READER',
  'CSV_READER',
  'ORDER_BY',
  'ART_INDEX',
  'COLUMN_DATA',
  'METADATA',
  'OVERFLOW_STRINGS',
  'IN_MEMORY_TABLE',
  'ALLOCATOR',
  'EXTENSION',
  'TRANSACTION',
  'EXTERNAL_FILE_CACHE',
] as const;

export type DuckMemoryTag = (typeof duckMemoryTags)[number];

export type DuckMemoryValues = {
  memory_usage_bytes: bigint;
  temporary_storage_bytes: bigint;
};

export type DuckMemoryRow = {
  tag: DuckMemoryTag;
  memory_usage_bytes: bigint;
  temporary_storage_bytes: bigint;
};

const orderByParams = {
  memory_usage_bytes_desc: 'memory_usage_bytes DESC',
  tag_desc: 'tag DESC',
  tag_asc: 'tag ASC',
};

type OrderByParams = keyof typeof orderByParams;

type DuckMemorySummary = {
  totalMB: number;
  totalTempMB: number;
};

export class DuckMemory {
  #conn: DuckDBConnection;
  #exec: DuckExec;
  constructor(duckdbConn: DuckDBConnection) {
    this.#conn = duckdbConn;
    this.#exec = new DuckExec(duckdbConn);
  }

  getAll = async (params?: {
    orderBy?: OrderByParams;
  }): Promise<DuckMemoryRow[]> => {
    const { orderBy } = params ?? {};
    const query = this.#applyOrderBy(
      `SELECT tag, memory_usage_bytes, temporary_storage_bytes 
             FROM duckdb_memory() as m`,
      orderBy
    );

    const res = await this.#conn.run(query);
    return res.getRowObjectsJS() as unknown as Promise<DuckMemoryRow[]>;
  };

  getByTag = async (tag: DuckMemoryTag): Promise<DuckMemoryRow | null> => {
    if (!duckMemoryTags.includes(tag)) {
      throw new Error(`Invalid DuckDB memory tag: ${tag}`);
    }
    const query = `SELECT tag, memory_usage_bytes, temporary_storage_bytes
                   FROM duckdb_memory() as m
                   WHERE tag = '${tag}'`;

    return this.#exec.getOneRowObjectJS<DuckMemoryRow>(query);
  };

  getSummary = async (): Promise<DuckMemorySummary> => {
    const rows = await this.getAll();
    const summaryInBytes: {
      total: bigint;
      totalTemp: bigint;
    } = {
      total: 0n,
      totalTemp: 0n,
    };
    for (const row of rows) {
      summaryInBytes.total += row.memory_usage_bytes;
      summaryInBytes.totalTemp += row.temporary_storage_bytes;
    }
    return {
      totalMB: Math.round(Number(summaryInBytes.total / 1_048_576n)),
      totalTempMB: Math.round(Number(summaryInBytes.totalTemp / 1_048_576n)),
    };
  };

  #applyOrderBy = (query: string, orderBy?: OrderByParams): string => {
    if (orderBy === undefined) return query;
    const orderByClause = orderByParams[orderBy];
    if (orderByClause === undefined) {
      throw new Error(`Invalid orderBy parameter: ${orderBy}`);
    }
    return `${query} ORDER BY ${orderByClause}`;
  };
}
