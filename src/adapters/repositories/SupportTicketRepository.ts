import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { SupportTicket } from "@/utils/schemas/supportTicket";
import { ISupportTicketRepository } from "@/domain/repositories/ISupportTicketRepository";
import { dynamoDBDocumentClient } from "@/infrastructure/database/dynamodb";
import { BaseRepository } from "./BaseRepository";

export class SupportTicketRepository extends BaseRepository implements ISupportTicketRepository {
  private tableName: string;

  constructor() {
    super();
    this.tableName = process.env.DYNAMODB_TABLE_SUPPORT_TICKETS ?? "support_tickets";

    if (!process.env.DYNAMODB_TABLE_SUPPORT_TICKETS) {
      console.warn(
        `[SupportTicketRepository] DYNAMODB_TABLE_SUPPORT_TICKETS not set, defaulting to "${this.tableName}".`,
      );
    }
  }

  private itemToTicket(item: Record<string, unknown>): SupportTicket {
    return {
      id: (item.id || item.Id) as string,
      customerName: item.customerName as string,
      customerEmail: item.customerEmail as string,
      subject: item.subject as string,
      message: item.message as string,
      status: item.status as any,
      priority: item.priority as any,
      category: item.category as string,
      customerId: item.customerId as string | undefined,
      isActive: item.isActive !== false,
      createdAt: item.createdAt ? new Date(item.createdAt as string) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : new Date(),
    };
  }

  async findById(id: string): Promise<SupportTicket | null> {
    try {
      const { Item } = await dynamoDBDocumentClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );

      return Item ? this.itemToTicket(Item) : null;
    } catch (error) {
      console.error(`[SupportTicketRepository] Error finding ticket ${id}:`, error);
      throw new Error(`Failed to find support ticket: ${(error as Error).message}`);
    }
  }

  async findAll(status?: string): Promise<SupportTicket[]> {
    try {
      // For simple scanning. If large dataset, should use Query with GSI.
      const params: any = {
        TableName: this.tableName,
      };

      if (status) {
        params.FilterExpression = "#s = :status";
        params.ExpressionAttributeNames = { "#s": "status" };
        params.ExpressionAttributeValues = { ":status": status };
      }

      const { Items } = await dynamoDBDocumentClient.send(new ScanCommand(params));
      return (Items || []).map((item) => this.itemToTicket(item));
    } catch (error) {
      console.error("[SupportTicketRepository] Error finding all tickets:", error);
      throw new Error(`Failed to find support tickets: ${(error as Error).message}`);
    }
  }

  async create(ticket: SupportTicket): Promise<SupportTicket> {
    try {
      const itemToSave = {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      };

      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: itemToSave,
        }),
      );

      return ticket;
    } catch (error) {
      console.error("[SupportTicketRepository] Error creating ticket:", error);
      throw new Error(`Failed to create support ticket: ${(error as Error).message}`);
    }
  }

  async update(ticket: SupportTicket): Promise<SupportTicket> {
    try {
      const itemToSave = {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: itemToSave,
        }),
      );

      return ticket;
    } catch (error) {
      console.error(`[SupportTicketRepository] Error updating ticket ${ticket.id}:`, error);
      throw new Error(`Failed to update support ticket: ${(error as Error).message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await dynamoDBDocumentClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );
    } catch (error) {
      console.error(`[SupportTicketRepository] Error deleting ticket ${id}:`, error);
      throw new Error(`Failed to delete support ticket: ${(error as Error).message}`);
    }
  }
}
