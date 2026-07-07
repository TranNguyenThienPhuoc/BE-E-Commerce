import { Hono } from "hono";
import { setupUserRoutes } from "./infrastructure/routes/userRoutes";
import { setupAuthRoutes } from "./infrastructure/routes/authRoutes";
import { setupProductVariantRoutes } from "./infrastructure/routes/productVariantRoutes";
import { setupProductRoutes } from "./infrastructure/routes/productRoutes";
import { setupCategoryRoutes } from "./infrastructure/routes/categoryRoutes";
import { setupOrderRoutes } from "./infrastructure/routes/orderRoutes";
import { setupPaymentRoutes } from "./infrastructure/routes/paymentRoutes";
import { setupShipmentRoutes } from "./infrastructure/routes/shipmentRoutes";

import { setupCartRoutes } from "./infrastructure/routes/cartRoutes";
import { setupUploadRoutes } from "./infrastructure/routes/uploadRoutes";
import { setupInventoryRoutes } from "./infrastructure/routes/inventoryRoutes";
import { setupReviewRoutes } from "./infrastructure/routes/reviewRoutes";
import { setupWishlistRoutes } from "./infrastructure/routes/wishlistRoutes";
import { setupSupportTicketRoutes } from "./infrastructure/routes/supportTicketRoutes";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadSecrets } from "./config";

// Load AWS Secrets before starting the app
await loadSecrets();

const app = new Hono();

const IS_DYNAMO =
  !!process.env.DYNAMODB_TABLE_USERS || process.env.USE_DYNAMODB === "true";

if (IS_DYNAMO) {
  const failOnInit = process.env.DYNAMODB_FAIL_ON_INIT === "true";
}
const allowOrigins = process.env.ALLOW_ORIGINS;

app.use(logger());
app.use(
  "*",
  cors({
    origin: allowOrigins || "http://localhost:3000",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 600,
  }),
);

setupUserRoutes(app);
setupAuthRoutes(app);
setupProductVariantRoutes(app);
setupProductRoutes(app);
setupCategoryRoutes(app);
setupOrderRoutes(app);
setupPaymentRoutes(app);
setupShipmentRoutes(app);

setupCartRoutes(app);
setupUploadRoutes(app);
setupInventoryRoutes(app);
setupReviewRoutes(app);
setupWishlistRoutes(app);
setupSupportTicketRoutes(app);

// Initialize Background Workers
import { Container } from "./infrastructure/dependencies/Container";
import { initializeSQSWorker } from "./infrastructure/sqsWorker";
const container = Container.getInstance();
// We temporarily cast to any because we need the private paymentUseCase or add a getter for it. 
// Actually, let's just add getPaymentUseCase to Container instead.
// For now, let's use any if not available.
const paymentUseCase = (container as any).paymentUseCase;
if (paymentUseCase) {
  initializeSQSWorker(paymentUseCase);
}

// Health check
app.get("/api/health", (c) => {
  return c.json({
    success: true,
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Requested resource not found",
      path: c.req.path,
      method: c.req.method,
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  console.error("[Server Error]:", err);
  return c.json(
    {
      success: false,
      error: err.message || "Internal server error",
    },
    500,
  );
});

export default {
  fetch: app.fetch,
  port: 8080,
};