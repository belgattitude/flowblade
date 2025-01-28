import { ProductRepo } from '@/features/products/server/product.repo';
import { dsKyselyMssql } from '@/server/config/ds.kysely-mssql.config';

export const productRepo = new ProductRepo({ ds: dsKyselyMssql });
