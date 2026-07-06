import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { WalletTransaction } from "@/utils/schemas/settlement";
import { dynamoDBDocumentClient } from "@/infrastructure/database";
import { BaseRepository } from "./BaseRepository";

export class WalletTransactionRepository extends BaseRepository {
  private tableName: string;

  constructor() {
    super();
    this.tableName = process.env.DYNAMODB_TABLE_WALLET_TRANSACTIONS || "wallet_transaction";
  }

  async createTransaction(transaction: WalletTransaction): Promise<void> {
    const cmd = new PutCommand({
      TableName: this.tableName,
      Item: transaction,
    });
    
    await dynamoDBDocumentClient.send(cmd);
  }

  async updateStatus(id: string, sellerId: string, status: WalletTransaction["status"]): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      // Assume id and sellerId are the partition and sort keys respectively if using a composite key
      // Or just id if simple. Let's use id. If we need to query by sellerId, sellerId is typically GSI or PK.
      // Assuming sellerId is PK, id is SK based on query pattern.
      Key: { sellerId, id }, 
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": new Date().toISOString(),
      },
    });

    await dynamoDBDocumentClient.send(cmd);
  }

  async getHistoryBySeller(sellerId: string): Promise<WalletTransaction[]> {
    const cmd = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "sellerId = :sellerId",
      ExpressionAttributeValues: {
        ":sellerId": sellerId,
      },
      // ScanIndexForward: false to get newest first
      ScanIndexForward: false
    });

    const res = await dynamoDBDocumentClient.send(cmd);
    return (res.Items as WalletTransaction[]) || [];
  }
}
