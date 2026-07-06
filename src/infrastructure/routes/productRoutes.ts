import { Hono } from "hono";
import { Container } from "@/infrastructure/dependencies/Container";
import { requireAuth, requireAdmin } from "@/infrastructure/middleware/auth";

export function setupProductRoutes(app: Hono) {

  const container = Container.getInstance();
  const productController = container.getProductController();

  app.post("/api/products/upload-url", requireAuth(), (c) =>
    productController.generatePresignedUrl(c),
  );
  app.post("/api/products/delete-image", requireAuth(), (c) =>
    productController.deleteImage(c),
  );
  app.patch("/api/products/:id/approve", requireAuth(), requireAdmin(), (c) =>
    productController.approveProduct(c),
  );
  app.post("/api/products", requireAuth(), requireAdmin(), (c) => productController.createProduct(c));
  app.get("/api/products", (c) => productController.listProducts(c));
  app.get("/api/products/:id", (c) => productController.getProduct(c));
  app.put("/api/products/:id", requireAuth(), requireAdmin(), (c) => productController.updateProduct(c));
  app.delete("/api/products/:id", requireAuth(), requireAdmin(), (c) => productController.deleteProduct(c));
}