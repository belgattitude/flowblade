import {describe, expectTypeOf} from "vitest";

import { QMeta, type QMetaJsonifiable, type QMetaSqlSpan } from "./q-meta";

describe("QMeta", () => {
  const sqlSpan: QMetaSqlSpan = {
    type: "sql",
    sql: "SELECT * FROM users",
    params: [],
    timeMs: 12,
    affectedRows: 10,
  };
  const createMeta = () =>
    new QMeta({
      name: "test-unit",
      spans: sqlSpan,
    });

  describe("withSpans()", () => {
    it("should create a new instance with added meta", () => {
      const newSqlSpan = structuredClone(sqlSpan);
      const meta = createMeta();
      const newMeta = meta.withSpan(newSqlSpan);
      expect(newMeta).not.toStrictEqual(meta);
      expect(newMeta).toBeInstanceOf(QMeta);
      expect(newMeta.getSpans().length).toBe(meta.getSpans().length + 1);
    });
    it("should create a deep copy of initial spans", () => {
      const newSqlSpan = structuredClone(sqlSpan);
      const meta = createMeta();
      const newMeta = meta.withSpan(newSqlSpan);
      const metaFirstSpan = meta.getSpans()[0]!; // as Writable<QMetaSpan>;
      // @ts-expect-error for the sake of testing, we force a modification
      metaFirstSpan.timeMs = 0;
      expect(meta.getSpans()[0]!.timeMs).toBe(0);
      expect(newMeta.getSpans()[0]!.timeMs).toBe(12);
    });
  });
  describe("getTotalTimeMs", () => {
    describe("when there is only one span", () => {
      it("should return the time of the only span", () => {
        const meta = createMeta();
        expect(meta.getTotalTimeMs()).toBe(sqlSpan.timeMs);
      });
    });
    describe("when multiple spans", () => {
      it("should return the total time of all spans", () => {
        const meta = createMeta();
        expect(
          meta
            .withSpan({
              type: "map",
              timeMs: 1000,
            })
            .getTotalTimeMs()
        ).toBe(1000 + sqlSpan.timeMs);
      });
    });
  });

  describe("getLatestSpan()", () => {
    it("should return the latest span", () => {
      const meta = createMeta();
      const latestSpan = meta.getLatestSpan();
      expect(latestSpan).toBe(sqlSpan);
    });
  });

  describe('getSpansByType()', () => {
    it('should return spans of the specified type', () => {
      const meta = createMeta();
      const sqlSpans = meta.getSpansByType('sql');
      expect(sqlSpans).toHaveLength(1);
      expect(sqlSpans[0]).toBe(sqlSpan);
    });
    it('should return an empty array if no spans of the specified type exist', () => {
      const meta = createMeta();
      const transformSpans = meta.getSpansByType('transform');
      expect(transformSpans).toHaveLength(0);
    });
  });

  describe('addSpan()', () => {
    it('should add a new span to the meta', () => {
      const meta = createMeta();
      const newSpan: QMetaSqlSpan = {
        type: 'sql',
        sql: 'SELECT * FROM orders',
        params: [],
        timeMs: 5,
        affectedRows: 5,
      };
      meta.addSpan(newSpan);
      const spans = meta.getSpans();
      expect(spans).toHaveLength(2);
      expect(spans[1]).toBe(newSpan);
    });
  });

  describe("toJSON()", () => {
    const sqlSpan: QMetaSqlSpan = {
      type: "sql",
      sql: "SELECT * FROM users",
      params: [],
      timeMs: 10.334,
      affectedRows: 10,
    };
    const meta = new QMeta({
      name: "test-unit",
      spans: sqlSpan,
    });
    it("should return a json serializable content", () => {
      const jsonifiable = meta.toJSON();
      expect(jsonifiable).toStrictEqual({
        name: "test-unit",
        spans: [sqlSpan],
      });
    });
    it("should return a json serializable content type", () => {
      const jsonifiable = meta.toJSON();
      expectTypeOf(jsonifiable).toEqualTypeOf<QMetaJsonifiable>();
    });
    it("jsonifiable content should match a native JSON.stringify call", () => {
      const jsonifiable = meta.toJSON();
      const jsonified = JSON.stringify(meta);
      expect(JSON.stringify(jsonifiable)).toStrictEqual(jsonified);
    });
  });
});
