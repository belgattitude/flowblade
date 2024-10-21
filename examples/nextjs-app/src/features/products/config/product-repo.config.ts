import { ProductRepo } from '@/features/products/server/product.repo';
import { kyselyDatasource } from '@/server/config/kyselyDatasource.config';

export const productRepo = new ProductRepo({ ds: kyselyDatasource });
