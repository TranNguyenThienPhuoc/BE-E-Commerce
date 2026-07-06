import {
  CreateProductVariantRequest,
  CreateProductVariantResponse,
  GetProductVariantRequest,
  GetProductVariantResponse,
  UpdateProductVariantRequest,
  UpdateProductVariantResponse,
  DeleteProductVariantRequest,
  DeleteProductVariantResponse,
  ListProductVariantsRequest,
  ListProductVariantsResponse,
} from "@/utils/schemas/endpoints/productVariants";

export interface IProductVariantUseCase {
  createVariant(
    request: CreateProductVariantRequest,
  ): Promise<CreateProductVariantResponse>;

  getVariant(
    request: GetProductVariantRequest,
  ): Promise<GetProductVariantResponse>;

  updateVariant(
    id: string,
    request: UpdateProductVariantRequest,
  ): Promise<UpdateProductVariantResponse>;

  deleteVariant(
    request: DeleteProductVariantRequest,
  ): Promise<DeleteProductVariantResponse>;

  listVariantsByProduct(
    request: ListProductVariantsRequest,
  ): Promise<ListProductVariantsResponse>;
}