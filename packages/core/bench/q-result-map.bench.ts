import { faker } from '@faker-js/faker/locale/en';
import { bench } from 'vitest';

import { QResult } from '../src';
import { QMeta } from '../src/meta/q-meta';

const GENERATED_ROWS = 100_000;

describe('QResult map benchmarks', () => {
  const fakeMeta = new QMeta({
    spans: {
      type: 'sql',
      affectedRows: 1,
      timeMs: 100,
      sql: 'select',
      params: [],
    },
  });

  const generatedRows = Array.from({ length: GENERATED_ROWS }, (_, i) => ({
    id: `${i}`,
    airline: faker.airline.airline().name,
    productDesc: faker.commerce.productDescription(),
    productName: faker.commerce.productName(),
  }));

  const mapToFinalPayload = (row: (typeof generatedRows)[0]) => {
    return {
      productName: row.productName.toUpperCase(),
      productDesc: row.productDesc,
      airline: row.airline,
      id: Number.parseInt(row.id),
    };
  };

  bench('baseline 1: map with native for const iteration', () => {
    const result = [];
    for (const row of generatedRows) {
      result.push(mapToFinalPayload(row));
    }
  });

  bench('baseline 2: map with native Array.map', () => {
    const _result = generatedRows.map((row) => mapToFinalPayload(row));
  });

  bench('with externally hoisted mapper function', () => {
    const _result = new QResult({
      meta: fakeMeta,
      data: generatedRows,
      // eslint-disable-next-line unicorn/no-array-callback-reference
    }).map(mapToFinalPayload);
  });

  bench('with inlined mapper', () => {
    const _result = new QResult({
      meta: fakeMeta,
      data: generatedRows,
      // eslint-disable-next-line unicorn/no-array-callback-reference
    }).map((row) => {
      return {
        productName: row.productName.toUpperCase(),
        productDesc: row.productDesc,
        airline: row.airline,
        id: Number.parseInt(row.id),
      };
    });
  });
});
