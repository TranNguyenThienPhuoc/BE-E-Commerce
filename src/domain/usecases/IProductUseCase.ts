import {
  CreateProductRequest,
  CreateProductResponse,
  DeleteProductRequest,
  DeleteProductResponse,
  GetProductRequest,
  GetProductResponse,
  ListProductsRequest,
  ListProductsResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  GeneratePresignedUrlRequest,
  GeneratePresignedUrlResponse,
} from "@/utils/schemas/endpoints";

export interface IProductUseCase {
  createProduct(
    request: CreateProductRequest,
  ): Promise<CreateProductResponse>;
  getProduct(
    request: GetProductRequest,
    userId?: string,
    role?: string,
  ): Promise<GetProductResponse>;
  updateProduct(
    id: string,
    request: UpdateProductRequest,
  ): Promise<UpdateProductResponse>;
  deleteProduct(
    request: DeleteProductRequest,
  ): Promise<DeleteProductResponse>;
  listProducts(
    request: ListProductsRequest,
    userId?: string,
    role?: string,
  ): Promise<ListProductsResponse>;

  generatePresignedUrl(
    request: GeneratePresignedUrlRequest,
  ): Promise<GeneratePresignedUrlResponse>;
  approveProduct(
    id: string,
    status: "active" | "rejected",
  ): Promise<UpdateProductResponse>;
  deleteImage(key: string): Promise<DeleteProductResponse>;
}