import {
  ApiResponse,
  ResponseDetails,
  StatusBuilder,
  ValidationError,
  validateData,
} from "@/utils";
import {
  CreateProductRequest,
  CreateProductResponse,
  DeleteProductRequest,
  DeleteProductResponse,
  GeneratePresignedUrlRequest,
  GeneratePresignedUrlResponse,
  GetProductRequest,
  GetProductResponse,
  ListProductsRequest,
  ListProductsResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from "@/utils/schemas/endpoints/products";
import {
  CreateProductInput,
  Product,
  ProductIdParamSchema,
  SanitizedProductInput,
  SanitizedProductInputSchema,
  UpdateProductInput,
  UpdateProductSchema,
} from "@/utils/schemas/product";
import { IProductRepository } from "@/domain/repositories/IProductRepository";
import { IInventoryRepository } from "@/domain/repositories/IInventoryRepository";
import { ICategoryRepository } from "@/domain/repositories/ICategoryRepository";
import { IProductUseCase } from "@/domain/usecases/IProductUseCase";
import { S3Service } from "@/infrastructure/s3/s3Service";
import { IProductVariantUseCase } from "@/domain/usecases/IProductVariantUseCase";
import {
  ProductEntity,
  DomainValidationError,
} from "@/domain/entities/Product";

import { RedisService } from "@/infrastructure/cache/RedisService";

const normalizeCategorySlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export class ProductUseCase implements IProductUseCase {
  constructor(
    private productRepository: IProductRepository,
    private s3Service: S3Service,
    private categoryRepository: ICategoryRepository,
    private inventoryRepository: IInventoryRepository,
    private variantUseCase: IProductVariantUseCase,
    private redisService: RedisService,
  ) {}

  async createProduct(
    request: CreateProductRequest,
  ): Promise<CreateProductResponse> {
    try {
      const validatedInput = validateData(SanitizedProductInputSchema, {
        ...request,
      });

      const categorySlug = await this.resolveCategorySlug(
        validatedInput.category,
      );
      validatedInput.category = categorySlug;

      const inputVariants = validatedInput.variants;
      const totalStock = this.calculateTotalStock(
        validatedInput.stock,
        inputVariants,
      );

      this.validateProductDomain(validatedInput, totalStock);

      const productId = crypto.randomUUID();
      const product = new ProductEntity(
        productId,
        validatedInput.name,
        validatedInput.price,
        totalStock,
        validatedInput.images || [],
        validatedInput.seoTitle,
        validatedInput.description,
        validatedInput.category,
        validatedInput.status || "pending",
        [],
      );

      const masterInventory = {
        id: productId,
        variantId: productId,
        variantSku: `MASTER-${productId.slice(0, 8).toUpperCase()}`,
        productId: productId,
        productName: validatedInput.name,
        category: validatedInput.category || "General",
        stock: totalStock,
        reserved: 0,
        available: totalStock,
        minStock: 0,
        maxStock: 9999,
        status: totalStock > 0 ? "in_stock" : "out_of_stock",
        lastUpdated: new Date().toISOString(),
      };

      const variantsWithInventory = inputVariants.map((v) => {
        const variantId = crypto.randomUUID();
        const variant = {
          ...v,
          id: variantId,
          productId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const inventory = {
          id: variantId,
          variantId: variantId,
          variantSku: v.sku,
          productId: productId,
          productName: `${validatedInput.name} - ${v.name}`,
          category: validatedInput.category || "General",
          stock: v.stock,
          reserved: 0,
          available: v.stock,
          minStock: 0,
          maxStock: 9999,
          status: v.stock > 0 ? "in_stock" : "out_of_stock",
          lastUpdated: new Date().toISOString(),
        };
        return { variant, inventory };
      });

      const savedProduct =
        await this.productRepository.createProductWithInventoryAndVariants(
          product.toJSON(),
          masterInventory,
          variantsWithInventory,
        );

      await this.redisService.delPattern('products:*');

      return StatusBuilder.ok(savedProduct);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async getProduct(
    request: GetProductRequest,
    userId?: string,
    role?: string,
  ): Promise<GetProductResponse> {
    try {
      const validatedParams = validateData(ProductIdParamSchema, {
        id: request.id,
      });
      
      const cacheKey = `products:detail:${validatedParams.id}`;
      let product = await this.redisService.get<Product>(cacheKey);

      if (!product) {
        product = await this.productRepository.findById(validatedParams.id);
        if (product) {
          await this.redisService.set(cacheKey, product, 300); // 5 mins
        }
      }

      if (!product) {
        return StatusBuilder.fail("Product not found", [
          { field: "id", message: "No product exists with the provided ID" },
        ]);
      }

      if (role !== "admin") {
        const isActive = product.status === "active";
        if (!isActive) {
          return StatusBuilder.fail("Product not found", [
            { field: "id", message: "No product exists with the provided ID" },
          ]);
        }
      }

      return StatusBuilder.ok(product);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateProduct(
    id: string,
    request: UpdateProductRequest,
  ): Promise<UpdateProductResponse> {
    try {
      const validatedParams = validateData(ProductIdParamSchema, { id });
      const existingProduct = await this.productRepository.findById(
        validatedParams.id,
      );

      if (!existingProduct) {
        return StatusBuilder.fail("Product not found", [
          { field: "id", message: "No product exists with the provided ID" },
        ]);
      }



      const validatedUpdate = validateData(
        UpdateProductSchema,
        request,
      ) as UpdateProductInput;
      ProductEntity.validateUpdate(validatedUpdate);

      if (validatedUpdate.category !== undefined) {
        validatedUpdate.category = await this.resolveCategorySlug(
          validatedUpdate.category,
        );
      }

      const updatedProduct = ProductEntity.fromValidatedData(existingProduct);
      this.applyUpdates(updatedProduct, validatedUpdate);

      const savedProduct = await this.productRepository.save(
        updatedProduct.toJSON(),
      );
      await this.redisService.delPattern('products:*');
      return StatusBuilder.ok(savedProduct);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteProduct(
    request: DeleteProductRequest,
  ): Promise<DeleteProductResponse> {
    try {
      const validatedParams = validateData(ProductIdParamSchema, {
        id: request.id,
      });
      const product = await this.productRepository.findById(validatedParams.id);

      if (!product) {
        return StatusBuilder.fail("Product not found", [
          { field: "id", message: "No product exists with the provided ID" },
        ]);
      }



      const variantsRes = await this.variantUseCase.listVariantsByProduct({
        productId: validatedParams.id,
      });
      const variantIds = variantsRes.success && variantsRes.data 
        ? variantsRes.data.map((v: any) => v.id) 
        : [];

      const deleted = await this.productRepository.deleteProductWithResources(
        validatedParams.id,
        variantIds,
      );

      if (!deleted) return StatusBuilder.fail("Failed to delete product");
      
      await this.redisService.delPattern('products:*');
      
      return StatusBuilder.ok(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listProducts(
    request: ListProductsRequest,
    userId?: string,
    role?: string,
  ): Promise<ListProductsResponse> {
    try {
      const page = request.page || 1;
      const limit = request.limit || 10;
      const skip = (page - 1) * limit;

      // 1. Tạo cache key dựa trên tham số query
      const cacheKey = `products:list:${page}:${limit}:${request.category || 'all'}:${request.status || 'all'}:${request.search || 'none'}:${request.isFlashSale !== undefined ? request.isFlashSale : 'all'}:${request.sortBy || 'none'}:${request.sortOrder || 'none'}:${role === 'admin' ? 'admin' : 'user'}`;
      
      // 2. Thử đọc từ Redis
      const cachedData = await this.redisService.get<any>(cacheKey);
      if (cachedData) {
        return StatusBuilder.paginated(cachedData.products, cachedData.meta);
      }

      const categoryFilter = await this.resolveCategoryFilter(request.category);
      const products = await this.productRepository.list({
        category: categoryFilter,
        status: request.status,
        search: request.search,
        isAdmin: role === "admin",
        isFlashSale: request.isFlashSale,
      });

      this.sortProducts(products, request.sortBy, request.sortOrder);

      const total = products.length;
      const paginatedProducts = products.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);

      const meta = {
        page,
        limit,
        total,
        totalPages,
      };

      // 3. Lưu kết quả vào Redis (Cache TTL: 5 phút)
      await this.redisService.set(cacheKey, { products: paginatedProducts, meta }, 300);

      return StatusBuilder.paginated(paginatedProducts, meta);
    } catch (error) {
      return this.handleError(error);
    }
  }



  async generatePresignedUrl(
    request: GeneratePresignedUrlRequest,
  ): Promise<GeneratePresignedUrlResponse> {
    try {
      const result = await this.s3Service.generatePresignedUrl({
        fileName: request.fileName,
        contentType: request.contentType,
        folder: "products",
      });
      return StatusBuilder.ok(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async approveProduct(
    id: string,
    status: "active" | "rejected",
  ): Promise<UpdateProductResponse> {
    try {
      const validatedParams = validateData(ProductIdParamSchema, { id });
      const existingProduct = await this.productRepository.findById(
        validatedParams.id,
      );

      if (!existingProduct) {
        return StatusBuilder.fail("Product not found", [
          { field: "id", message: "No product exists with the provided ID" },
        ]);
      }

      const updatedProduct = ProductEntity.fromValidatedData(existingProduct);
      updatedProduct.status = status;

      const savedProduct = await this.productRepository.save(
        updatedProduct.toJSON(),
      );
      await this.redisService.delPattern('products:*');
      return StatusBuilder.ok(savedProduct);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteImage(key: string): Promise<DeleteProductResponse> {
    try {
      await this.s3Service.deleteFile(key);
      return StatusBuilder.ok(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async resolveCategorySlug(
    categoryInput?: string,
  ): Promise<string | undefined> {
    if (!categoryInput) return undefined;

    let slug = categoryInput;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      )
    ) {
      const category = await this.categoryRepository.findById(slug);
      if (category) slug = category.slug;
    }

    const normalized = normalizeCategorySlug(slug);
    if (!normalized) {
      throw new DomainValidationError("Validation failed", [
        {
          field: "category",
          message: "Category slug must contain alphanumeric characters",
        },
      ]);
    }

    const referenced = await this.categoryRepository.findBySlug(normalized);
    if (!referenced) {
      throw new DomainValidationError("Category not found", [
        {
          field: "category",
          message: "No category exists with the provided slug or ID",
        },
      ]);
    }

    return normalized;
  }

  private async resolveCategoryFilter(
    category?: string,
  ): Promise<string | undefined> {
    if (!category) return undefined;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category,
      )
    ) {
      const cat = await this.categoryRepository.findById(category);
      return cat?.slug || category;
    }
    return category;
  }

  private calculateTotalStock(
    baseStock: number,
    variants: SanitizedProductInput["variants"],
  ): number {
    if (variants.length > 0) {
      return variants.reduce((sum: number, v) => sum + (v.stock || 0), 0);
    }
    return baseStock;
  }

  private validateProductDomain(
    input: SanitizedProductInput,
    totalStock: number,
  ): void {
    const { variants, ...productData } = input;
    ProductEntity.validateCreation({
      ...productData,
      stock: totalStock,
      variants: [],
    });
  }





  private applyUpdates(
    product: ProductEntity,
    update: UpdateProductInput,
  ): void {
    if (update.name !== undefined) product.name = update.name;
    if (update.price !== undefined) product.price = update.price;
    if (update.stock !== undefined) product.stock = update.stock;
    if (update.images !== undefined) product.images = update.images;
    if (update.description !== undefined)
      product.description = update.description;
    if (update.category !== undefined) product.category = update.category;
    if (update.status !== undefined) product.status = update.status;
  }

  private sortProducts(
    products: Product[],
    sortBy?: string,
    sortOrder?: string,
  ): void {
    if (!sortBy) return;
    const order = sortOrder === "asc" ? 1 : -1;
    const key = sortBy as keyof Product;
    products.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });
  }

  private handleError(error: unknown): ApiResponse<never> {
    if (error instanceof ValidationError) {
      return StatusBuilder.fail("Validation failed", error.details);
    }
    if (error instanceof DomainValidationError) {
      return StatusBuilder.fail("Validation failed", error.details);
    }
    const err = error as { message?: string; name?: string };
    if (
      err?.message?.includes("does not exist") ||
      err?.name === "ResourceNotFoundException"
    ) {
      return StatusBuilder.fail(err.message || "Database resource not found.");
    }
    return StatusBuilder.fail(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }

  async generatePresignedUrl(
    request: GeneratePresignedUrlRequest,
  ): Promise<GeneratePresignedUrlResponse> {
    try {
      const result = await this.s3Service.generatePresignedUrl({
        fileName: request.fileName,
        contentType: request.contentType,
        folder: request.folder || "products",
      });

      return StatusBuilder.ok(result);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async deleteImage(key: string): Promise<DeleteProductResponse> {
    try {
      await this.s3Service.deleteFile(key);
      return StatusBuilder.ok({ success: true, message: "Image deleted" } as any);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }
}
