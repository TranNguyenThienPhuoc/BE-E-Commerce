import { Product } from "@/utils/schemas/product";
import { ProductStatus } from "@/utils/schemas/endpoints/products";

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  findByStatus(status: ProductStatus): Promise<Product[]>;
  searchByName(searchTerm: string): Promise<Product[]>;
  list(filters?: {
    category?: string;
    status?: ProductStatus;
    search?: string;
    isAdmin?: boolean;
    userId?: string;
    isFlashSale?: boolean;
  }): Promise<Product[]>;

  save(product: Product): Promise<Product>;
  delete(id: string): Promise<boolean>;
  findByIds(ids: string[]): Promise<Product[]>;
  createProductWithInventoryAndVariants(
    product: Product,
    inventory: any,
    variants?: { variant: any; inventory: any }[],
  ): Promise<Product>;
  deleteProductWithResources(productId: string, variantIds: string[]): Promise<boolean>;
}






