import { Context } from "hono";
import { ISettlementUseCase } from "@/domain/usecases/ISettlementUseCase";
import { getUserIdFromContext } from "@/utils/auth";
import { WithdrawalRequestSchema } from "@/utils/schemas/settlement";

export class SettlementController {
  constructor(private settlementUseCase: ISettlementUseCase) {}

  // Seller APIs
  async getWallet(c: Context) {
    try {
      const sellerId = getUserIdFromContext(c);
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getWallet(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async getSellerTransactions(c: Context) {
    try {
      const sellerId = getUserIdFromContext(c);
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getSellerTransactions(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async getSellerWithdrawals(c: Context) {
    try {
      const sellerId = getUserIdFromContext(c);
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getSellerWithdrawals(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async requestWithdrawal(c: Context) {
    try {
      const sellerId = getUserIdFromContext(c);
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const body = await c.req.json();
      
      const result = await this.settlementUseCase.createWithdrawalRequest(
        sellerId,
        body.amount,
        body.bankName,
        body.bankAccount,
        body.accountHolder || ""
      );
      
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  // Admin APIs
  async getPendingWithdrawals(c: Context) {
    try {
      // In a real app, verify admin role here
      const result = await this.settlementUseCase.getAllPendingWithdrawals();
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async approveWithdrawal(c: Context) {
    try {
      const adminId = getUserIdFromContext(c);
      if (!adminId) return c.json({ success: false, message: "Unauthorized" }, 401);
      
      const requestId = c.req.param("id");
      const result = await this.settlementUseCase.approveWithdrawal(adminId, requestId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async rejectWithdrawal(c: Context) {
    try {
      const adminId = getUserIdFromContext(c);
      if (!adminId) return c.json({ success: false, message: "Unauthorized" }, 401);
      
      const requestId = c.req.param("id");
      const result = await this.settlementUseCase.rejectWithdrawal(adminId, requestId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }
}
