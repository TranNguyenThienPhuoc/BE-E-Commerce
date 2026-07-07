import { SupportTicket } from "@/utils/schemas/supportTicket";

export interface ISupportTicketRepository {
  create(ticket: SupportTicket): Promise<SupportTicket>;
  findById(id: string): Promise<SupportTicket | null>;
  findAll(status?: string): Promise<SupportTicket[]>;
  update(ticket: SupportTicket): Promise<SupportTicket>;
  delete(id: string): Promise<void>;
}
