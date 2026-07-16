import { Hono } from "hono";
import { Container } from "@/infrastructure/dependencies/Container";
import { requireAuth } from "@/infrastructure/middleware/auth";

export const setupPaymentRoutes = (app: Hono) => {
  const container = Container.getInstance();
  const paymentController = container.getPaymentController();

  // Public webhook route (MUST not require Auth)
  app.post("/api/payments/webhook", (c) => paymentController.payosWebhook(c));

  // Protected routes
  app.post("/api/payments", requireAuth(), (c) => paymentController.createPayment(c));
  app.get("/api/payments", requireAuth(), (c) => paymentController.listAllPayments(c));
  app.get("/api/payments/:id", requireAuth(), (c) => paymentController.getPayment(c));
  app.get("/api/payments/order/:orderId", requireAuth(), (c) => paymentController.getPaymentsByOrder(c));
  app.patch("/api/payments/:id", requireAuth(), (c) => paymentController.updatePayment(c));
  app.post("/api/payments/:id/process", requireAuth(), (c) => paymentController.processPayment(c));
  app.post("/api/payments/create", requireAuth(), (c) => paymentController.createPayosPaymentUrl(c));
};