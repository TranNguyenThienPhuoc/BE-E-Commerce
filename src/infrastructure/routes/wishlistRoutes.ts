import { Hono } from "hono";
import { Container } from "../dependencies/Container";
import { requireAuth } from "../middleware/auth";

export const setupWishlistRoutes = (app: Hono) => {
  app.use("/api/wishlist", requireAuth());
  app.use("/api/wishlist/*", requireAuth());

  const container = Container.getInstance();
  const wishlistController = container.getWishlistController();

  app.get("/api/wishlist", (c) => wishlistController.getWishlist(c));
  app.post("/api/wishlist/:productId", (c) => wishlistController.addToWishlist(c));
  app.delete("/api/wishlist/:productId", (c) => wishlistController.removeFromWishlist(c));
};
