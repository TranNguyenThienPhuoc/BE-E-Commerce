import { ApiResponse } from "@/utils/statusBuilder";
import { Product } from "@/utils/schemas/product";

export interface IWishlistUseCase {
  getWishlist(userId: string): Promise<ApiResponse<Product[]>>;
  addToWishlist(userId: string, productId: string): Promise<ApiResponse<{ success: boolean }>>;
  removeFromWishlist(userId: string, productId: string): Promise<ApiResponse<{ success: boolean }>>;
}
