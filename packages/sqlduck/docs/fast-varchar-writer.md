# Faster VARCHAR writes for the DuckDB appender (FastVarcharWriter)

> Reference notes from a performance investigation of `SqlDuck.toTable`
> (2026-10-11). Nothing here is shipped in sqlduck: the technique needs
> `@duckdb/node-bindings`, which sqlduck can't depend on directly. The
> intended home is upstream, in `@duckdb/node-api` (see
> [Upstream change](#upstream-change-duckdbvarcharvectorflush)).

## TL;DR

- Writing strings into data chunks is the biggest cost of `toTable`: about
  **32% of the time**. `@duckdb/node-api` makes one native call
  (`vector_assign_string_element`) per string, at about 60 ns each.
- Writing all the strings of a vector with **1–2 native calls instead of one
  per string** is **3–4.7x faster per chunk**. It makes `SqlDuck.toTable`
  **1.38x faster** when done upstream inside `DuckDBVarCharVector.flush`,
  with no change in sqlduck.
- The data is identical in every case tested: nulls, unicode, inline/pointer
  boundary, long strings, `VARCHAR[]` children, and 1M-row tables compared by
  hash.

Environment: Apple M5 Pro, Node 24.21.0, Bun 1.4.3,
`@duckdb/node-api` / `@duckdb/node-bindings` `1.5.6-r.1`, mitata.

## The problem

CPU profile of `SqlDuck.toTable`: 1M rows of the `bench/appender.bench.ts`
schema (`id`, `name`, `email` nullable, `bignumber`, `created_at`), in-memory
database, 4 threads, about 500 ms per run:

| Self time                                                     | Share   |
| ------------------------------------------------------------- | ------: |
| `DuckDBVarCharVector.flush` (one native call per string)      | **32%** |
| fake row generation (test harness)                            |    ~20% |
| `DuckDBAppender.appendDataChunk` (DuckDB copying the data)    |      8% |
| `rowsToConvertedColumnsChunks` + `fillRow`                    |     ~8% |
| converters (`toTimestampMs`…), `setItem`s                     |     <3% |

The current `flush` in node-api:

```js
flush() {
  for (let itemIndex = 0; itemIndex < this._itemCount; itemIndex++) {
    if (this.itemCacheDirty[itemIndex]) {
      const cachedItem = this.itemCache[itemIndex];
      if (cachedItem !== undefined && cachedItem !== null) {
        node_bindings.vector_assign_string_element(this.vector, this.itemOffset + itemIndex, cachedItem);
      }
      this.itemCacheDirty[itemIndex] = false;
    }
  }
  this.validity.flush(this.vector);
}
```

## What the bindings expose

There's no Arrow import and no bulk-string API. The building blocks are:

| Binding                                                    | Use                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `vector_assign_string_element_len(vector, index, Uint8Array)` | Copies a byte array into the vector string heap. One call can store **all** the strings of a vector.                                      |
| `vector_get_data(vector, byteCount)`                       | Returns a **copy** of the vector data, **not a live view**. Writing to it does nothing; node-api writes back with `copy_data_to_vector`. |
| `copy_data_to_vector(vector, offset, buffer, …)`           | "Efficient-but-unsafe" memory copy into the vector data.                                                                                  |
| `copy_data_to_vector_validity(vector, …)`                  | The same for the validity mask, which is how node-api's `DuckDBValidity.flush` writes nulls.                                                |
| `data_chunk_reset(chunk)`                                  | Reuses a chunk. Not needed for this optimization.                                                                                          |

## The technique: one "arena" string per vector

A VARCHAR vector holds one 16-byte `duckdb_string_t` per row. Its layout is
public in `duckdb.h`, little endian:

```text
length <= 12 : | length u32 | 12 inlined bytes (zero padded)          |
length  > 12 : | length u32 | 4 bytes prefix | pointer u64 (to heap)  |
```

Steps for each vector:

1. **Encode once.** `values.join("")` (nulls join as `""`) is encoded with a
   single `TextEncoder.encodeInto`. If the bytes written equal the joined
   string length, every string is ASCII and its UTF-8 length is its
   `.length`. Otherwise it falls back to one `encodeInto` per string; the
   result is still correct, just without the bulk speedup.
2. **One native call.** `vector_assign_string_element_len` stores the whole
   buffer in the vector string heap, through the first row. `vector_get_data`
   then reads back that row's `string_t` to get the heap pointer.
3. **Build every `string_t` in JS.** Strings of 12 bytes or less are inlined
   (DuckDB requires it). Longer strings get their 4-byte prefix plus
   `pointer + offset`, with the 64-bit addition done as two `u32` values plus
   a carry.
4. **One copy.** `copy_data_to_vector` writes all the structs at once, which
   also overwrites the temporary first row. Nulls are written as a validity
   bitmask.

Why it's valid:

- The arena stays alive in the vector's string buffer until the chunk is
  destroyed or reset.
- Every substring starts and ends on a string boundary, so it's valid UTF-8.
  DuckDB checks this at append time, as "Invalid unicode … in segment
  statistics update".
- `appendDataChunk` copies the strings into the appender, so the chunk can be
  freed afterwards. This is the same behaviour node-api relies on today.

### Things that didn't work

| Approach (one 2048-row chunk)                           | Why not                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Writing directly into `vector_get_data`                 | It returns a copy: the writes are lost, and DuckDB later fails on invalid unicode.            |
| Inline only strings ≤ 12 bytes                          | One `encodeInto` per string costs as much as the native call (1.39x on short strings only).   |
| Deduplicate repeated strings per chunk                  | 3.5x faster on low cardinality, but 1.4x **slower** when strings are unique (`Map` overhead). |
| Arena with one `encodeInto` per string                  | Correct, but no faster: the cost is the per-string encoding, not the native call.             |

The ASCII `join` + one `encodeInto` is what makes the arena fast.

## Results

### Filling one VARCHAR chunk of 2048 rows

| Strategy                              | long, 20 distinct | long, all distinct | short, all distinct |
| ------------------------------------- | ----------------: | -----------------: | ------------------: |
| node-api `setColumns` (current)       |            148 µs |             155 µs |              124 µs |
| raw `vector_assign_string_element`    |            132 µs |             141 µs |              108 µs |
| inline ≤ 12 bytes                     |            143 µs |             149 µs |               87 µs |
| dedup per chunk                       |             43 µs |             219 µs |              162 µs |
| **arena + ASCII join**                |         **31 µs** |          **36 µs** |           **41 µs** |

### End to end, 1M rows, `appender.bench.ts` schema (2 VARCHAR columns, 1 nullable)

| Variant                                                                                    |   Time | Speedup   |
| ------------------------------------------------------------------------------------------ | -----: | --------: |
| `SqlDuck.toTable` (current)                                                                 | 503 ms | —         |
| sqlduck-side `FastVarcharWriter` (bypasses node-api for VARCHAR columns)                   | 339 ms | **1.48x** |
| `SqlDuck.toTable` with the **upstream `flush` patch**, pre-generated rows                  | 246 ms | **1.38x** (vs 340 ms) |

After the change the string writer is 8.6% of the profile (down from 32%).
What remains is mostly the row source, `appendDataChunk` (10%) and
`rowsToConvertedColumnsChunks` (9%).

### Correctness checks

The upstream patch was compared against the original `flush` through the
public `DuckDBDataChunk.setColumns` path, appended, then read back. Every
case below is **identical**:

- 2048 long repeated strings; 2048 short strings with 20% nulls; all nulls
- total arena ≤ 12 bytes (no heap allocation)
- unicode and emoji, `""`, 12 / 13 byte boundary, a 100,000-character string
- `VARCHAR[]` with nulls (the child vector goes through the same `flush`)
- 1M-row `toTable` tables: same `count(*)`, `count(email)`,
  `sum(hash(name))` and `sum(hash(email))`

## Risks

- **The `string_t` layout is written by hand.** It is part of the public C
  API (`duckdb_string_t` in `duckdb.h`), but this code assumes a
  little-endian, 64-bit platform, which covers every platform Node or Bun
  ships on.
- **Every row points into one shared heap allocation.** This is valid as long
  as the chunk lives until `appendDataChunk` has copied it, which is already
  required today.
- **The arena path only runs when every item of the vector is dirty**, which
  is the normal case when filling a chunk for an append. Partial updates keep
  the per-string loop.
- **Arenas of 4 GB or more** (possible only on huge list children) fall back
  to the old loop, because `string_t.length` is a `u32`.

## FastVarcharWriter (sqlduck-side prototype)

This prototype was used for the first measurements. It needs
`@duckdb/node-bindings`, so **it can't ship in sqlduck**. It's kept here for
reference. It writes one VARCHAR column of a `DuckDBDataChunk`, in place of
`chunk.setColumnValues(columnIndex, values)`, after setting
`chunk.rowCount`.

```ts
import { createRequire } from "node:module";
import type { DuckDBDataChunk } from "@duckdb/node-api";

const req = createRequire(createRequire(import.meta.url).resolve("@duckdb/node-api"));
const b = req("@duckdb/node-bindings");
const enc = new TextEncoder();

/**
 * Write a VARCHAR column with 1-2 native calls per chunk instead of one per
 * string: the strings are stored once as a single "arena" string in the vector
 * heap, then each row duckdb_string_t (len u32 | prefix 4 | ptr u64, or
 * len u32 | 12 inlined bytes) is built in JS and copied at once.
 */
export class FastVarcharWriter {
  #arena = new Uint8Array(1 << 16);
  #structs: Uint8Array;
  #structsView: DataView;
  #lens: Int32Array;
  #validity: Uint32Array;
  constructor(capacity: number) {
    this.#structs = new Uint8Array(capacity * 16);
    this.#structsView = new DataView(this.#structs.buffer);
    this.#lens = new Int32Array(capacity);
    this.#validity = new Uint32Array(Math.ceil(capacity / 64) * 2);
  }
  write(chunk: DuckDBDataChunk, columnIndex: number, values: readonly (string | null | undefined)[]) {
    const vec = b.data_chunk_get_vector(chunk.chunk, columnIndex);
    const n = values.length;
    const lens = this.#lens;
    // null/undefined join as ""
    const joined = values.join("");
    if (this.#arena.length < joined.length * 3) this.#arena = new Uint8Array(joined.length * 3);
    let { written: total } = enc.encodeInto(joined, this.#arena);
    let nulls = 0;
    if (total === joined.length) {
      for (let i = 0; i < n; i++) {
        const v = values[i];
        if (v == null) { lens[i] = -1; nulls++; } else lens[i] = v.length;
      }
    } else {
      // non ascii: utf8 length of each string
      total = 0;
      for (let i = 0; i < n; i++) {
        const v = values[i];
        if (v == null) { lens[i] = -1; nulls++; continue; }
        const { written } = enc.encodeInto(v, this.#arena.subarray(total));
        lens[i] = written;
        total += written;
      }
    }
    const a = this.#arena;
    const s = this.#structs;
    const dv = this.#structsView;
    let baseLo = 0;
    let baseHi = 0;
    if (total > 12) {
      b.vector_assign_string_element_len(vec, 0, a.subarray(0, total));
      const head: Uint8Array = b.vector_get_data(vec, 16);
      const hv = new DataView(head.buffer, head.byteOffset, 16);
      baseLo = hv.getUint32(8, true);
      baseHi = hv.getUint32(12, true);
    }
    let off = 0;
    for (let i = 0; i < n; i++) {
      const len = lens[i]!;
      const o = i * 16;
      if (len <= 12) {
        dv.setUint32(o, len < 0 ? 0 : len, true);
        let j = 0;
        for (; j < len; j++) s[o + 4 + j] = a[off + j]!;
        for (; j < 12; j++) s[o + 4 + j] = 0;
        if (len > 0) off += len;
      } else {
        dv.setUint32(o, len, true);
        s[o + 4] = a[off]!; s[o + 5] = a[off + 1]!; s[o + 6] = a[off + 2]!; s[o + 7] = a[off + 3]!;
        const lo = baseLo + off;
        dv.setUint32(o + 8, lo >>> 0, true);
        dv.setUint32(o + 12, baseHi + (lo > 0xff_ff_ff_ff ? 1 : 0), true);
        off += len;
      }
    }
    b.copy_data_to_vector(vec, 0, s.buffer, 0, n * 16);
    if (nulls > 0) {
      const words = Math.ceil(n / 64) * 2;
      const v = this.#validity;
      v.fill(0xff_ff_ff_ff, 0, words);
      for (let i = 0; i < n; i++) if (lens[i]! < 0) v[i >>> 5]! &= ~(1 << (i & 31));
      b.vector_ensure_validity_writable(vec);
      b.copy_data_to_vector_validity(vec, 0, v.buffer, 0, words * 4);
    }
  }
}
```

Usage in a `toTable`-like loop:

```ts
const writer = new FastVarcharWriter(2048);
const chunk = DuckDBDataChunk.create(types);
chunk.rowCount = columns[0].length;
for (let c = 0; c < columns.length; c++) {
  if (types[c].typeId === DuckDBTypeId.VARCHAR) writer.write(chunk, c, columns[c]);
  else chunk.setColumnValues(c, columns[c]);
}
appender.appendDataChunk(chunk);
```

## Upstream change: `DuckDBVarCharVector.flush`

This is the same technique inside node-api, so every user of `setColumns`,
`setColumnValues` or `DuckDBDataChunkWriter` benefits, with no API change.
The diff below is against the published
`@duckdb/node-api@1.5.6-r.1/lib/vectors/DuckDBVarCharVector.js`. It applies
cleanly with `patch -p1` from the package root. Port it to the TypeScript
source of `DuckDBVarCharVector` in duckdb-node-neo for a PR.

Implementation notes:

- It reuses the vector's own `dataView` buffer (already `itemCount * 16`
  bytes) to build the structs. It also handles `itemOffset`, so sliced
  vectors and list children work.
- The scratch buffers are module-level and grow when needed, so there are no
  allocations per flush.
- The arena is stored through the first item (`itemOffset`), whose
  `string_t` is then overwritten by the final copy.
- The validity mask is unchanged: `this.validity.flush(this.vector)`.

```diff
--- a/lib/vectors/DuckDBVarCharVector.js
+++ b/lib/vectors/DuckDBVarCharVector.js
@@ -9,6 +9,11 @@
 const DuckDBVector_1 = require("./DuckDBVector");
 const DuckDBValidity_1 = require("./DuckDBValidity");
 const dataAccessors_1 = require("./dataAccessors");
+const textEncoder = new TextEncoder();
+const maxStringLength = 0xffffffff;
+// Scratch buffers shared by all flushes, grown when needed
+let arenaBytes = new Uint8Array(1 << 16);
+let arenaLengths = new Int32Array(2048);
 class DuckDBVarCharVector extends DuckDBVector_1.DuckDBVector {
     dataView;
     validity;
@@ -56,17 +61,116 @@
         this.itemCacheDirty[itemIndex] = true;
     }
     flush() {
-        for (let itemIndex = 0; itemIndex < this._itemCount; itemIndex++) {
-            if (this.itemCacheDirty[itemIndex]) {
-                const cachedItem = this.itemCache[itemIndex];
-                if (cachedItem !== undefined && cachedItem !== null) {
-                    node_bindings_1.default.vector_assign_string_element(this.vector, this.itemOffset + itemIndex, cachedItem);
+        let allDirty = this._itemCount > 0;
+        for (let i = 0; i < this._itemCount && allDirty; i++) {
+            allDirty = this.itemCacheDirty[i] === true;
+        }
+        // When every item is written (ie: filling a data chunk), copy all strings
+        // with 1-2 native calls instead of one per item.
+        if (!allDirty || !this.flushAllItems()) {
+            for (let itemIndex = 0; itemIndex < this._itemCount; itemIndex++) {
+                if (this.itemCacheDirty[itemIndex]) {
+                    const cachedItem = this.itemCache[itemIndex];
+                    if (cachedItem !== undefined && cachedItem !== null) {
+                        node_bindings_1.default.vector_assign_string_element(this.vector, this.itemOffset + itemIndex, cachedItem);
+                    }
+                    this.itemCacheDirty[itemIndex] = false;
                 }
-                this.itemCacheDirty[itemIndex] = false;
             }
         }
         this.validity.flush(this.vector);
     }
+    /**
+     * Stores the utf8 bytes of all items once in the vector string heap (one
+     * "arena" string), then writes each item duckdb_string_t pointing into it:
+     *   length u32 | 12 inlined bytes                      (length <= 12)
+     *   length u32 | 4 bytes prefix | pointer u64 (LE)     (length > 12)
+     * Returns false (nothing written) when the arena would not fit a string.
+     */
+    flushAllItems() {
+        const count = this._itemCount;
+        const items = this.itemCache;
+        if (arenaLengths.length < count) {
+            arenaLengths = new Int32Array(count);
+        }
+        const lengths = arenaLengths;
+        // null / undefined items join as ""
+        const joined = (items.length === count ? items : items.slice(0, count)).join('');
+        if (arenaBytes.length < joined.length * 3) {
+            arenaBytes = new Uint8Array(joined.length * 3);
+        }
+        let total = textEncoder.encodeInto(joined, arenaBytes).written;
+        if (total === joined.length) {
+            // ascii only: utf8 length is the string length
+            for (let i = 0; i < count; i++) {
+                const item = items[i];
+                lengths[i] = item == null ? -1 : item.length;
+            }
+        }
+        else {
+            total = 0;
+            for (let i = 0; i < count; i++) {
+                const item = items[i];
+                if (item == null) {
+                    lengths[i] = -1;
+                    continue;
+                }
+                const { written } = textEncoder.encodeInto(item, arenaBytes.subarray(total));
+                lengths[i] = written;
+                total += written;
+            }
+        }
+        if (total > maxStringLength) {
+            return false;
+        }
+        const bytes = arenaBytes;
+        let pointerLo = 0;
+        let pointerHi = 0;
+        if (total > 12) {
+            // Through the first item, overwritten below by its own string_t
+            node_bindings_1.default.vector_assign_string_element_len(this.vector, this.itemOffset, bytes.subarray(0, total));
+            const head = (0, dataAccessors_1.vectorData)(this.vector, (this.itemOffset + 1) * 16);
+            const headView = new DataView(head.buffer, head.byteOffset + this.itemOffset * 16, 16);
+            pointerLo = headView.getUint32(8, true);
+            pointerHi = headView.getUint32(12, true);
+        }
+        const view = this.dataView;
+        const out = new Uint8Array(view.buffer, view.byteOffset, count * 16);
+        let offset = 0;
+        for (let i = 0; i < count; i++) {
+            const length = lengths[i];
+            const o = i * 16;
+            if (length <= 12) {
+                view.setUint32(o, length < 0 ? 0 : length, true);
+                let j = 0;
+                for (; j < length; j++) {
+                    out[o + 4 + j] = bytes[offset + j];
+                }
+                for (; j < 12; j++) {
+                    out[o + 4 + j] = 0;
+                }
+                if (length > 0) {
+                    offset += length;
+                }
+            }
+            else {
+                view.setUint32(o, length, true);
+                out[o + 4] = bytes[offset];
+                out[o + 5] = bytes[offset + 1];
+                out[o + 6] = bytes[offset + 2];
+                out[o + 7] = bytes[offset + 3];
+                const lo = pointerLo + offset;
+                view.setUint32(o + 8, lo >>> 0, true);
+                view.setUint32(o + 12, pointerHi + (lo > maxStringLength ? 1 : 0), true);
+                offset += length;
+            }
+        }
+        node_bindings_1.default.copy_data_to_vector(this.vector, this.itemOffset * 16, view.buffer, view.byteOffset, count * 16);
+        for (let i = 0; i < count; i++) {
+            this.itemCacheDirty[i] = false;
+        }
+        return true;
+    }
     slice(offset, length) {
         return new DuckDBVarCharVector(new DataView(this.dataView.buffer, this.dataView.byteOffset + offset * 16, length * 16), this.validity.slice(offset, length), this.vector, offset, length);
     }
```

### Validating the patch without editing `node_modules`

The patched file can be compiled as node-api's own module and its methods
swapped onto the real class, so the original and patched versions can be
compared in the same process. Don't edit the file in `node_modules`: with
pnpm it's hard-linked to the global store.

```ts
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { DuckDBVarCharVector } from "@duckdb/node-api";

const apiMain = createRequire(import.meta.url).resolve("@duckdb/node-api");
const filename = path.join(path.dirname(apiMain), "vectors", "DuckDBVarCharVector.js");
const m = new (Module as any)(filename);
m.filename = filename;
m.paths = (Module as any)._nodeModulePaths(path.dirname(filename));
m._compile(fs.readFileSync("/path/to/patched/DuckDBVarCharVector.js", "utf8"), filename);
const patched = m.exports.DuckDBVarCharVector.prototype;

const proto = DuckDBVarCharVector.prototype as any;
const originalFlush = proto.flush;
proto.flushAllItems = patched.flushAllItems;
export const usePatchedFlush = (on: boolean) => {
  proto.flush = on ? patched.flush : originalFlush;
};
```

Then, for each case: build a chunk with `setColumns`, append it, read it back
with `usePatchedFlush(false)` and `usePatchedFlush(true)`, and compare the
results. For the end-to-end check, run `SqlDuck.toTable` twice and compare
`sum(hash(column))` per column.

## Other findings from the same investigation

- **ENUM columns:** `DuckDBDataChunk.create` rebuilds every ENUM type for each
  chunk (native `createEnum` plus reading the dictionary back, about 205 µs
  for 1000 members). This makes large enums slower than VARCHAR. Small
  enums (a few members) are faster than VARCHAR: 1.36–2x through `toTable`,
  4–7x on the raw append. Upstream fix: `DuckDBDataChunk.getColumnVector`
  could pass the known type to `DuckDBVector.create(vector, itemCount,
  knownType)`. The sqlduck-side workaround (reusing one chunk for full
  chunks) brought 1000 members from 1.17x to 1.04x slower than VARCHAR.
- **Sync row streams:** `for await` over a sync generator awaits every row.
  A plain `for...of` path in `rowsToConvertedColumnsChunks` made
  `toTable` 1.29x faster for sync generators. It was tried and not kept.
- **Writing rows directly into vectors** (`getColumnVector().setItem()`,
  without column arrays) only gains about 2%: not worth the complexity.
