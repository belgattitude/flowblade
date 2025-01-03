import { faker } from '@faker-js/faker/locale/en';
import { bench } from 'vitest';

import type { QueryResultMeta } from '../src';
import { QMeta, QResult } from '../src/query-result/q-result';

const testMeta: QueryResultMeta = {
  affectedRows: 1,
  timeMs: 100,
  query: {
    sql: 'select',
    params: [],
  },
};

describe('QueryResult', () => {
  const benchData = Array.from({ length: 1_000_000 }, (_, i) => ({
    id: `${i}`,
    airline: faker.airline.airline().name,
    productDesc: faker.commerce.productDescription(),
    productName: faker.commerce.productName(),
  }));
  const exhaustiveMapper = (row: (typeof benchData)[0]) => {
    return {
      productName: row.productName.toUpperCase(),
      productDesc: row.productDesc,
      airline: row.airline,
      id: Number.parseInt(row.id),
    };
  };

  bench('With for const', () => {
    const result = [];
    for (const element of benchData) {
      result.push(exhaustiveMapper(element));
    }
  });

  bench('without QueryResult map', () => {
    const result = benchData.map((element) => exhaustiveMapper(element));
  });
  bench('with mapper', () => {
    const result = new QResult(
      new QMeta(testMeta),
      benchData,
      undefined
    ).transform(exhaustiveMapper);
    console.log(result.meta);
  });
  bench('with inlined mapper', () => {
    const result = new QResult(
      new QMeta(testMeta),
      benchData,
      undefined
    ).transform((row) => {
      return {
        productDesc: row.productDesc,
        productName: row.productName.toUpperCase(),
        airline: row.airline,
        id: Number.parseInt(row.id),
      };
    });
  });
});
