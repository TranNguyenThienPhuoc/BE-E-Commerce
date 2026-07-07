import { ISupportTicketRepository } from "@/domain/repositories/ISupportTicketRepository";
import { SupportTicketEntity } from "@/domain/entities/SupportTicketEntity";
import { StatusBuilder, ApiResponse } from "@/utils/statusBuilder";
import {
  CreateSupportTicketRequest,
  CreateSupportTicketSchema,
  UpdateSupportTicketRequest,
  UpdateSupportTicketSchema,
  SupportTicket,
} from "@/utils/schemas/supportTicket";

export interface ISupportTicketUseCase {
  createTicket(request: CreateSupportTicketRequest): Promise<ApiResponse<SupportTicket>>;
  getTickets(status?: string): Promise<ApiResponse<SupportTicket[]>>;
  updateTicketStatus(id: string, request: UpdateSupportTicketRequest): Promise<ApiResponse<SupportTicket>>;
}

export class SupportTicketUseCase implements ISupportTicketUseCase {
  constructor(private supportTicketRepository: ISupportTicketRepository) {}

  async createTicket(request: CreateSupportTicketRequest): Promise<ApiResponse<SupportTicket>> {
    try {
      const validatedInput = CreateSupportTicketSchema.parse(request);
      
      const ticketId = crypto.randomUUID();
      const ticketEntity = new SupportTicketEntity(
        ticketId,
        validatedInput.customerName,
        validatedInput.customerEmail,
        validatedInput.subject,
        validatedInput.message,
        "open",
        "medium",
        "General",
        validatedInput.customerId,
      );

      const savedTicket = await this.supportTicketRepository.create(ticketEntity.toJSON());
      
      return StatusBuilder.ok(savedTicket);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        return StatusBuilder.fail("Validation failed", (error as any).issues.map((i: any) => ({
          field: i.path.join("."),
          message: i.message,
        })));
      }
      console.error("[SupportTicketUseCase] createTicket error:", error);
      return StatusBuilder.fail("Internal Server Error");
    }
  }

  async getTickets(status?: string): Promise<ApiResponse<SupportTicket[]>> {
    try {
      const tickets = await this.supportTicketRepository.findAll(status);
      
      // Sort newest first
      tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return StatusBuilder.ok(tickets);
    } catch (error: unknown) {
      console.error("[SupportTicketUseCase] getTickets error:", error);
      return StatusBuilder.fail("Internal Server Error");
    }
  }

  async updateTicketStatus(id: string, request: UpdateSupportTicketRequest): Promise<ApiResponse<SupportTicket>> {
    try {
      const validatedInput = UpdateSupportTicketSchema.parse(request);

      const ticketData = await this.supportTicketRepository.findById(id);
      if (!ticketData) {
        return StatusBuilder.fail("Support ticket not found");
      }

      const ticketEntity = SupportTicketEntity.fromJSON(ticketData);

      if (validatedInput.status) {
        ticketEntity.updateStatus(validatedInput.status);
      }
      
      if (validatedInput.priority) {
        ticketEntity.updatePriority(validatedInput.priority);
      }

      // Here you would implement Email sending logic if replyMessage is provided
      if (validatedInput.replyMessage) {
        // e.g. await emailService.sendReply(...)
        console.log(`[SupportTicketUseCase] Sending email to ${ticketEntity.customerEmail}: ${validatedInput.replyMessage}`);
      }

      const updatedTicket = await this.supportTicketRepository.update(ticketEntity.toJSON());
      return StatusBuilder.ok(updatedTicket);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ZodError") {
        return StatusBuilder.fail("Validation failed", (error as any).issues.map((i: any) => ({
          field: i.path.join("."),
          message: i.message,
        })));
      }
      console.error("[SupportTicketUseCase] updateTicketStatus error:", error);
      return StatusBuilder.fail("Internal Server Error");
    }
  }
}
