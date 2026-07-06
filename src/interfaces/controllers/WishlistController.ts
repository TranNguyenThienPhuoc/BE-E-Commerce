import { Context } from "hono";
import { IWishlistUseCase } from "@/domain/usecases/IWishlistUseCase";

export class WishlistController {
  constructor(private readonly wishlistUseCase: IWishlistUseCase) {}

  async getWishlist(c: Context) {
    const user = c.get("user");
    const response = await this.wishlistUseCase.getWishlist(user.userId);
    return c.json(response, response.success ? 200 : 400);
  }

  async addToWishlist(c: Context) {
    const user = c.get("user");
    const productId = c.req.param("productId");
    const response = await this.wishlistUseCase.addToWishlist(user.userId, productId);
    return c.json(response, response.success ? 200 : 400);
  }

  async removeFromWishlist(c: Context) {
    const user = c.get("user");
    const productId = c.req.param("productId");
    const response = await this.wishlistUseCase.removeFromWishlist(user.userId, productId);
    return c.json(response, response.success ? 200 : 400);
  }
}
