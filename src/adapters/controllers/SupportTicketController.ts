import { Context } from "hono";
import { ISupportTicketUseCase } from "@/application/usecases/SupportTicketUseCase";
import { StatusBuilder } from "@/utils/statusBuilder";

export class SupportTicketController {
  constructor(private supportTicketUseCase: ISupportTicketUseCase) {}

  async createTicket(c: Context) {
    try {
      const json = await c.req.json();
      
      // If user is authenticated, we can optionally attach their ID
      const userId = c.get("userId");
      if (userId) {
        json.customerId = userId;
      }

      const response = await this.supportTicketUseCase.createTicket(json);
      
      if (response.success) {
        return c.json(response, 201);
      } else {
        return c.json(response, 400);
      }
    } catch (error: unknown) {
      console.error("[SupportTicketController] Error creating ticket:", error);
      return c.json(StatusBuilder.fail("Internal Server Error"), 500);
    }
  }

  async getTickets(c: Context) {
    try {
      const status = c.req.query("status");
      const response = await this.supportTicketUseCase.getTickets(status);
      
      if (response.success) {
        return c.json(response, 200);
      } else {
        return c.json(response, 400);
      }
    } catch (error: unknown) {
      console.error("[SupportTicketController] Error getting tickets:", error);
      return c.json(StatusBuilder.fail("Internal Server Error"), 500);
    }
  }

  async updateTicketStatus(c: Context) {
    try {
      const id = c.req.param("id");
      const json = await c.req.json();
      
      const response = await this.supportTicketUseCase.updateTicketStatus(id, json);
      
      if (response.success) {
        return c.json(response, 200);
      } else {
        return c.json(response, 400);
      }
    } catch (error: unknown) {
      console.error("[SupportTicketController] Error updating ticket:", error);
      return c.json(StatusBuilder.fail("Internal Server Error"), 500);
    }
  }
}
