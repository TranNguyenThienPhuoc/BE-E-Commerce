import { GetCommand, PutCommand, ScanCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { WithdrawalRequest, WithdrawalStatusSchema } from "@/utils/schemas/settlement";
import { dynamoDBDocumentClient } from "@/infrastructure/database";
import { BaseRepository } from "./BaseRepository";

export class WithdrawalRepository extends BaseRepository {
  private tableName: string;

  constructor() {
    super();
    this.tableName = process.env.DYNAMODB_TABLE_WITHDRAWALS || "withdrawal_table";
  }

  async createRequest(request: WithdrawalRequest): Promise<void> {
    const cmd = new PutCommand({
      TableName: this.tableName,
      Item: this.prepareItem(request),
    });

    await dynamoDBDocumentClient.send(cmd);
  }

  async getById(id: string): Promise<WithdrawalRequest | null> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });

    const res = await dynamoDBDocumentClient.send(cmd);
    if (!res.Item) {
      // Try capital Id fallback
      const cmdFallback = new GetCommand({
        TableName: this.tableName,
        Key: { Id: id },
      });
      const resFallback = await dynamoDBDocumentClient.send(cmdFallback);
      if (!resFallback.Item) return null;
      return this.mapItem(resFallback.Item);
    }
    return this.mapItem(res.Item);
  }

  async getSellerRequests(sellerId: string): Promise<WithdrawalRequest[]> {
    const indexName = process.env.DYNAMODB_WITHDRAWALS_SELLER_INDEX;
    
    if (indexName) {
      const cmd = new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: "sellerId = :sellerId",
        ExpressionAttributeValues: {
          ":sellerId": sellerId,
        },
      });
      const res = await dynamoDBDocumentClient.send(cmd);
      return (res.Items || []).map(item => this.mapItem(item));
    } else {
      const cmd = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "sellerId = :sellerId",
        ExpressionAttributeValues: {
          ":sellerId": sellerId,
        },
      });
      const res = await dynamoDBDocumentClient.send(cmd);
      return (res.Items || []).map(item => this.mapItem(item));
    }
  }

  async getPendingRequests(): Promise<WithdrawalRequest[]> {
    const cmd = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: "#st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": "Pending",
      },
    });

    const res = await dynamoDBDocumentClient.send(cmd);
    return (res.Items || []).map(item => this.mapItem(item));
  }

  async getAllRequests(): Promise<WithdrawalRequest[]> {
    const cmd = new ScanCommand({
      TableName: this.tableName,
    });

    const res = await dynamoDBDocumentClient.send(cmd);
    return (res.Items || []).map(item => this.mapItem(item));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: "SET #st = :status, processedAt = :processedAt",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":processedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (e: any) {
      if (e.name === "ValidationException") {
        const cmdFallback = new UpdateCommand({
          TableName: this.tableName,
          Key: { Id: id },
          UpdateExpression: "SET #st = :status, processedAt = :processedAt",
          ExpressionAttributeNames: {
            "#st": "status",
          },
          ExpressionAttributeValues: {
            ":status": status,
            ":processedAt": new Date().toISOString(),
          },
        });
        await dynamoDBDocumentClient.send(cmdFallback);
      } else {
        throw e;
      }
    }
  }

  private mapItem(item: Record<string, any>): WithdrawalRequest {
    return {
      id: item.id || item.Id,
      sellerId: item.sellerId,
      amount: item.amount,
      bankName: item.bankName,
      bankAccount: item.bankAccount,
      status: WithdrawalStatusSchema.parse(item.status),
      createdAt: item.createdAt,
      processedAt: item.processedAt,
    };
  }
}
