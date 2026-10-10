import type { InferResult, SelectQueryBuilder } from "kysely";
import type { ZodObject, ZodType } from "zod";

type Params<TQuery extends SelectQueryBuilder<any, any, any>> = {
  query: TQuery;
  schema: ZodObject<{
    [K in keyof NoInfer<InferResult<TQuery>[number]>]-?: ZodType<
      NoInfer<InferResult<TQuery>[number]>[K]
    >;
  }>;
};
export class KyselyQueryWithZodSchema<
  TQuery extends SelectQueryBuilder<any, any, any> = SelectQueryBuilder<
    any,
    any,
    any
  >,
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
