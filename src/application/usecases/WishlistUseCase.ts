import { IWishlistUseCase } from "@/domain/usecases/IWishlistUseCase";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IProductRepository } from "@/domain/repositories/IProductRepository";
import { StatusBuilder, ApiResponse } from "@/utils/statusBuilder";
import { Product } from "@/utils/schemas/product";

export class WishlistUseCase implements IWishlistUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async getWishlist(userId: string): Promise<ApiResponse<Product[]>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return StatusBuilder.fail("User not found");
      }

      const favorites = user.favorites || [];
      const products: Product[] = [];

      for (const productId of favorites) {
        const product = await this.productRepository.findById(productId);
        if (product && product.status === 'active') {
          products.push(product);
        }
      }

      return StatusBuilder.ok(products);
    } catch (error) {
      return StatusBuilder.fail("Failed to get wishlist");
    }
  }

  async addToWishlist(userId: string, productId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return StatusBuilder.fail("User not found");
      }

      const product = await this.productRepository.findById(productId);
      if (!product) {
        return StatusBuilder.fail("Product not found");
      }

      const favorites = user.favorites || [];
      if (!favorites.includes(productId)) {
        favorites.push(productId);
        // Note: the repository update method might need to support partial updates
        // Since we don't know if we can do partial, we'll save the whole user
        await this.userRepository.save({ ...user, favorites });
      }

      return StatusBuilder.ok({ success: true });
    } catch (error) {
      return StatusBuilder.fail("Failed to add to wishlist");
    }
  }

  async removeFromWishlist(userId: string, productId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return StatusBuilder.fail("User not found");
      }

      const favorites = user.favorites || [];
      const newFavorites = favorites.filter(id => id !== productId);

      await this.userRepository.save({ ...user, favorites: newFavorites });

      return StatusBuilder.ok({ success: true });
    } catch (error) {
      return StatusBuilder.fail("Failed to remove from wishlist");
    }
  }
}
