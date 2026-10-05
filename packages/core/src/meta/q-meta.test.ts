import { describe, expectTypeOf, expect, it } from "vitest";

import {
  QMeta,
  type QMetaJsonifiable,
  type QMetaMapSpan,
  type QMetaMaterializationSpan,
  type QMetaSpan,
  type QMetaSqlSpan,
} from "./q-meta";

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
      expect(newMeta.getSpans()).toHaveLength(meta.getSpans().length + 1);
    });

    it("should not share the spans list with the original instance", () => {
      const meta = createMeta();
      const newMeta = meta.withSpan(structuredClone(sqlSpan));
      expect(meta.getSpans()).toHaveLength(1);
      expect(newMeta.getSpans()).toHaveLength(2);
      newMeta.addSpan({ type: "map", timeMs: 1 });
      expect(meta.getSpans()).toHaveLength(1);
    });

    it("should support spans that cannot be structured cloned", () => {
      const meta = createMeta().withSpan({
        type: "custom",
        timeMs: 1,
        affectedRows: 1,
        // functions are not supported by structuredClone
        helper: () => "value",
      } as QMetaSpan);
      expect(meta.withSpan({ type: "map", timeMs: 1 }).getSpans()).toHaveLength(
        3
      );
    });
  });
  describe("span immutability", () => {
    it("should not freeze or keep a reference to the provided span", () => {
      const span = structuredClone(sqlSpan);
      const meta = new QMeta({ spans: span });
      expect(Object.isFrozen(span)).toBe(false);
      expect(meta.getSpans()[0]).not.toBe(span);
      span.timeMs = 999;
      expect(meta.getSpans()[0]!.timeMs).toBe(sqlSpan.timeMs);
    });

    it("should throw when modifying a stored span", () => {
      const meta = createMeta();
      const stored = meta.getSpans()[0] as { timeMs: number };
      expect(() => {
        stored.timeMs = 0;
      }).toThrow(TypeError);
    });

    it("should throw when modifying the params of a stored sql span", () => {
      const meta = new QMeta({
        spans: { ...sqlSpan, params: [1, 2] },
      });
      const stored = meta.getSpans()[0] as unknown as QMetaSqlSpan;
      expect(() => {
        (stored.params as unknown[]).push(3);
      }).toThrow(TypeError);
    });

    it("should freeze spans added with addSpan() and withSpan()", () => {
      const meta = createMeta();
      meta.addSpan({ type: "map", timeMs: 1 });
      const newMeta = meta.withSpan({ type: "map", timeMs: 2 });
      expect(meta.getSpans().every((span) => Object.isFrozen(span))).toBe(true);
      expect(newMeta.getSpans().every((span) => Object.isFrozen(span))).toBe(
        true
      );
    });

    it("should share the same frozen span instances between metas", () => {
      const meta = createMeta();
      const newMeta = meta.withSpan({ type: "map", timeMs: 2 });
      expect(newMeta.getSpans()[0]).toBe(meta.getSpans()[0]);
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
      expect(latestSpan).toStrictEqual(sqlSpan);
    });
  });

  describe("getSpansByType()", () => {
    it("should return spans of the specified type", () => {
      const meta = createMeta();
      const sqlSpans = meta.getSpansByType("sql");
      expect(sqlSpans).toHaveLength(1);
      expect(sqlSpans[0]).toStrictEqual(sqlSpan);
    });

    it("should narrow the span type from the requested type", () => {
      const meta = createMeta();
      expectTypeOf(meta.getSpansByType("sql")[0]!).toEqualTypeOf<
        Readonly<QMetaSqlSpan>
      >();
      expectTypeOf(meta.getSpansByType("map")[0]!).toEqualTypeOf<
        Readonly<QMetaMapSpan>
      >();
    });

    it("should narrow materialization spans to their dedicated shape", () => {
      const materializationSpan: QMetaMaterializationSpan = {
        type: "materialization",
        ddl: "CREATE TABLE t (id INTEGER)",
        timeMs: 3,
        affectedRows: 42,
        tableName: "t",
      };
      const meta = createMeta().withSpan(materializationSpan);
      const [span] = meta.getSpansByType("materialization");
      expectTypeOf(span!).toEqualTypeOf<Readonly<QMetaMaterializationSpan>>();
      expect(span?.tableName).toBe("t");
      expect(span?.affectedRows).toBe(42);
    });

    it("should expose affectedRows on custom span types", () => {
      const meta = createMeta().withSpan({
        type: "custom",
        timeMs: 3,
        affectedRows: 7,
      });
      const [span] = meta.getSpansByType("custom");
      expectTypeOf(span!.affectedRows).toEqualTypeOf<number>();
      expect(span?.affectedRows).toBe(7);
    });

    it("should return an empty array if no spans of the specified type exist", () => {
      const meta = createMeta();
      const transformSpans = meta.getSpansByType("transform");
      expect(transformSpans).toHaveLength(0);
    });
  });

  describe("addSpan()", () => {
    it("should add a new span to the meta", () => {
      const meta = createMeta();
      const newSpan: QMetaSqlSpan = {
        type: "sql",
        sql: "SELECT * FROM orders",
        params: [],
        timeMs: 5,
        affectedRows: 5,
      };
      meta.addSpan(newSpan);
      const spans = meta.getSpans();
      expect(spans).toHaveLength(2);
      expect(spans[1]).toStrictEqual(newSpan);
    });
  });

  describe("prependSpan()", () => {
    it("should insert the span before the existing ones", () => {
      const meta = createMeta();
      const newSpan: QMetaMapSpan = { type: "map", timeMs: 5 };
      meta.prependSpan(newSpan);
      const spans = meta.getSpans();
      expect(spans).toHaveLength(2);
      expect(spans[0]).toStrictEqual(newSpan);
      expect(spans[1]).toStrictEqual(sqlSpan);
      expect(meta.getLatestSpan()).toStrictEqual(sqlSpan);
    });

    it("should store a frozen copy of the span", () => {
      const meta = createMeta();
      const newSpan: QMetaMapSpan = { type: "map", timeMs: 5 };
      meta.prependSpan(newSpan);
      expect(Object.isFrozen(newSpan)).toBe(false);
      expect(Object.isFrozen(meta.getSpans()[0])).toBe(true);
    });

    it("should be included in the total time", () => {
      const meta = createMeta();
      meta.prependSpan({ type: "map", timeMs: 5 });
      expect(meta.getTotalTimeMs()).toBe(sqlSpan.timeMs + 5);
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
