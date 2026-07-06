import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SellerWallet } from "@/utils/schemas/settlement";
import { dynamoDBDocumentClient } from "@/infrastructure/database";
import { BaseRepository } from "./BaseRepository";

export class WalletRepository extends BaseRepository {
  private tableName: string;

  constructor() {
    super();
    this.tableName = process.env.DYNAMODB_TABLE_WALLETS || "seller_wallet";
  }

  async getWallet(sellerId: string): Promise<SellerWallet> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { sellerId },
    });

    try {
      const res = await dynamoDBDocumentClient.send(cmd);
      if (res.Item) {
        return res.Item as SellerWallet;
      }
      
      // If no wallet exists, return a default empty wallet
      const newWallet: SellerWallet = {
        sellerId,
        availableBalance: 0,
        pendingBalance: 0,
        lockedBalance: 0,
        withdrawnBalance: 0,
        currency: 'VND',
        updatedAt: new Date().toISOString()
      };
      
      return newWallet;
    } catch (error) {
      console.error("Error fetching wallet:", error);
      throw error;
    }
  }

  async incrementPendingBalance(sellerId: string, amount: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET pendingBalance = if_not_exists(pendingBalance, :zero) + :amount, updatedAt = :updatedAt, availableBalance = if_not_exists(availableBalance, :zero), lockedBalance = if_not_exists(lockedBalance, :zero), withdrawnBalance = if_not_exists(withdrawnBalance, :zero)",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":zero": 0,
        ":updatedAt": new Date().toISOString(),
      },
    });

    await dynamoDBDocumentClient.send(cmd);
  }

  async movePendingToAvailable(sellerId: string, amount: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET pendingBalance = pendingBalance - :amount, availableBalance = if_not_exists(availableBalance, :zero) + :amount, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(sellerId) AND pendingBalance >= :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":zero": 0,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error("Insufficient pending balance or wallet not found");
      }
      throw error;
    }
  }

  async lockBalance(sellerId: string, amount: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET availableBalance = availableBalance - :amount, lockedBalance = if_not_exists(lockedBalance, :zero) + :amount, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(sellerId) AND availableBalance >= :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":zero": 0,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error("Insufficient available balance or wallet not found");
      }
      throw error;
    }
  }

  async increaseWithdrawnBalance(sellerId: string, amount: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET lockedBalance = lockedBalance - :amount, withdrawnBalance = if_not_exists(withdrawnBalance, :zero) + :amount, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(sellerId) AND lockedBalance >= :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":zero": 0,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error("Insufficient locked balance or wallet not found");
      }
      throw error;
    }
  }

  async unlockBalance(sellerId: string, amount: number): Promise<void> {
    // For rejecting a withdrawal request, moving locked back to available
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET lockedBalance = lockedBalance - :amount, availableBalance = availableBalance + :amount, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(sellerId) AND lockedBalance >= :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error("Insufficient locked balance or wallet not found");
      }
      throw error;
    }
  }

  async decreasePendingBalance(sellerId: string, amount: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { sellerId },
      UpdateExpression: "SET pendingBalance = pendingBalance - :amount, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(sellerId) AND pendingBalance >= :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      await dynamoDBDocumentClient.send(cmd);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new Error("Insufficient pending balance or wallet not found");
      }
      throw error;
    }
  }
}
