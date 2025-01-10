import type { QError, QResult } from '@flowblade/core';
import type { KyselyDatasource } from '@flowblade/source-kysely';
import type { DBKyselySqlServer } from '@flowblade-examples/db-sqlserver/kysely-types';
import { z } from 'zod';

const validators = {
  search: {
    params: z.object({
      limit: z.coerce.number().optional().default(100),
      searchName: z.string().optional(),
    }),
    result: z.array(
      z.object({
        id: z.number(),
        reference: z.string().nullable(),
        name: z.string(),
        barcode_ean13: z.string().nullable(),
        brand_id: z.number().nullable(),
        brand_name: z.string().nullable(),
      })
    ),
  },
} as const;

type SearchParams = z.infer<typeof validators.search.params>;
type SearchResult = QResult<z.infer<typeof validators.search.result>, QError>;

export class ProductRepo<
  T extends
    KyselyDatasource<DBKyselySqlServer> = KyselyDatasource<DBKyselySqlServer>,
> {
  private ds: T;
  public static readonly validators = validators;

  constructor(params: { ds: T }) {
    this.ds = params.ds;
  }
  search = async (params: SearchParams): Promise<SearchResult> => {
    const { searchName, limit } = params;

    const query = this.ds.queryBuilder
      .selectFrom('common.product as p')
      .select([
        'p.id',
        'p.reference',
        'p.name',
        'p.barcode_ean13',
        'p.brand_id as cool',
      ])
      .leftJoin('common.brand as b', 'b.id', 'p.brand_id')
      .select(['b.id as brand_id', 'b.name as brand_name'])
      .$if(searchName !== undefined, (q) =>
        q.where('p.name', 'like', `%${searchName}%`)
      )
      .top(limit);

    /**
     * @todo still a bug to figure out. Why the type is not working
     */
    const result = await this.ds.query(query);
    // const { data, meta, error } = result;
    console.log(
      'Test to see if the types are working',
      result.data![0]!.reference
    );
    return result;
  };
}
