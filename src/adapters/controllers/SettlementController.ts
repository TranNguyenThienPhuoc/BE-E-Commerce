import { Context } from "hono";
import { ISettlementUseCase } from "@/domain/usecases/ISettlementUseCase";
import { WithdrawalRequestSchema } from "@/utils/schemas/settlement";

export class SettlementController {
  constructor(private settlementUseCase: ISettlementUseCase) {}

  // Seller APIs
  async getWallet(c: Context) {
    try {
      const sellerId = c.get("userId");
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getWallet(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async getSellerTransactions(c: Context) {
    try {
      const sellerId = c.get("userId");
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getSellerTransactions(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async getSellerWithdrawals(c: Context) {
    try {
      const sellerId = c.get("userId");
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const result = await this.settlementUseCase.getSellerWithdrawals(sellerId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async requestWithdrawal(c: Context) {
    try {
      const sellerId = c.get("userId");
      if (!sellerId) return c.json({ success: false, message: "Unauthorized" }, 401);

      const body = await c.req.json();
      
      const parseResult = WithdrawalRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return c.json({
          success: false,
          message: "Validation Error",
          errors: parseResult.error.errors,
        }, 400);
      }

      const result = await this.settlementUseCase.requestWithdrawal(sellerId, parseResult.data);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  // Admin APIs
  async getPendingWithdrawals(c: Context) {
    try {
      const result = await this.settlementUseCase.getPendingWithdrawals();
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async approveWithdrawal(c: Context) {
    try {
      const withdrawalId = c.req.param("id");
      const adminId = c.get("userId");

      const result = await this.settlementUseCase.processWithdrawal(withdrawalId, "Approved", adminId);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  async rejectWithdrawal(c: Context) {
    try {
      const withdrawalId = c.req.param("id");
      const adminId = c.get("userId");
      
      const body = await c.req.json().catch(() => ({}));
      const note = body.note;

      const result = await this.settlementUseCase.processWithdrawal(withdrawalId, "Rejected", adminId, note);
      return c.json(result, result.success ? 200 : 400);
    } catch (error) {
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }
}
