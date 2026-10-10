import type { InferResult, SelectQueryBuilder } from "kysely";
import type { ZodObject, ZodType } from "zod";

/**
 * Any kysely select query. `any` is the kysely idiom here: the builder generics
 * are invariant, so `unknown`/`never` would reject concrete queries or lose the
 * row type inferred by `InferResult`.
 */
// eslint-disable-next-line typescript/no-explicit-any
type AnySelectQueryBuilder = SelectQueryBuilder<any, any, any>;

type Params<TQuery extends AnySelectQueryBuilder> = {
  query: TQuery;
  schema: ZodObject<{
    [K in keyof NoInfer<InferResult<TQuery>[number]>]-?: ZodType<
      NoInfer<InferResult<TQuery>[number]>[K]
    >;
  }>;
};
export class KyselyQueryWithZodSchema<
  TQuery extends AnySelectQueryBuilder = AnySelectQueryBuilder,
> {
  readonly #params: Params<TQuery>;
  constructor(params: Params<TQuery>) {
    this.#params = params;
  }

  /**
   * Return zod schema that can be used to create the duckdb table
   */
  getSchema = () => this.#params.schema;

  /**
   * Return the underlying kysely query
   */
  getQuery = () => this.#params.query;
}
