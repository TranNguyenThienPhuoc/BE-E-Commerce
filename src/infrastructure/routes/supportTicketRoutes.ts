import { Hono } from "hono";
import { Container } from "@/infrastructure/dependencies/Container";
import { requireAuth, requireAdmin } from "@/infrastructure/middleware/auth";

export function setupSupportTicketRoutes(app: Hono) {
  const container = Container.getInstance();
  const supportTicketController = container.getSupportTicketController();

  // Public endpoint for customers to create a support ticket
  app.post("/api/support-tickets", (c) => supportTicketController.createTicket(c));
  
  // Admin endpoints
  app.get("/api/support-tickets", requireAuth(), requireAdmin(), (c) => supportTicketController.getTickets(c));
  app.put("/api/support-tickets/:id", requireAuth(), requireAdmin(), (c) => supportTicketController.updateTicketStatus(c));
}
