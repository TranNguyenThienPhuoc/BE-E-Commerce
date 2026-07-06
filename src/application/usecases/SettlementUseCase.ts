import crypto from "crypto";
import { ISettlementUseCase } from "@/domain/usecases/ISettlementUseCase";
import { IOrderRepository } from "@/domain/repositories/IOrderRepository";
import { WalletRepository } from "@/adapters/repositories/WalletRepository";
import { WalletTransactionRepository } from "@/adapters/repositories/WalletTransactionRepository";
import { WithdrawalRepository } from "@/adapters/repositories/WithdrawalRepository";
import { ApiResponse, StatusBuilder } from "@/utils/schemas/api";
import { WalletTransaction, WithdrawalRequest, SellerWallet } from "@/utils/schemas/settlement";

export class SettlementUseCase implements ISettlementUseCase {
  private commissionRate = 0.10; // 10%

  constructor(
    private orderRepository: IOrderRepository,
    private walletRepository: WalletRepository,
    private walletTransactionRepository: WalletTransactionRepository,
    private withdrawalRepository: WithdrawalRepository
  ) {}

  async getWallet(sellerId: string): Promise<ApiResponse<SellerWallet>> {
    try {
      const wallet = await this.walletRepository.getWallet(sellerId);
      return StatusBuilder.ok(wallet);
    } catch (error) {
      console.error("getWallet error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to get wallet");
    }
  }

  async processSettlement(orderId: string): Promise<ApiResponse<WalletTransaction>> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return StatusBuilder.fail("Order not found");
      }

      if (order.paymentStatus !== "paid") {
        return StatusBuilder.fail("Order payment is not completed");
      }

      const grossAmount = order.totalAmount;
      const commission = grossAmount * this.commissionRate;
      const sellerAmount = grossAmount - commission;

      const walletBefore = await this.walletRepository.getWallet(order.sellerId);

      const transaction: WalletTransaction = {
        id: crypto.randomUUID(),
        sellerId: order.sellerId,
        type: 'SETTLEMENT',
        referenceId: order.id,
        amount: sellerAmount,
        balanceBefore: walletBefore.pendingBalance, // Snapshot of pending balance before
        balanceAfter: walletBefore.pendingBalance + sellerAmount,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await this.walletTransactionRepository.createTransaction(transaction);
      
      // Increment the pending balance in the wallet
      await this.walletRepository.incrementPendingBalance(order.sellerId, sellerAmount);

      return StatusBuilder.ok(transaction);
    } catch (error) {
      console.error("processSettlement error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to process settlement");
    }
  }

  async releaseSettlement(orderId: string): Promise<ApiResponse<void>> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) return StatusBuilder.fail("Order not found");

      // Find the pending transaction
      const txs = await this.walletTransactionRepository.getHistoryBySeller(order.sellerId);
      const pendingTx = txs.find(t => t.referenceId === orderId && t.type === 'SETTLEMENT' && t.status === 'Pending');
      
      if (!pendingTx) {
        return StatusBuilder.fail("Pending settlement transaction not found");
      }

      // Move funds from pending to available
      await this.walletRepository.movePendingToAvailable(order.sellerId, pendingTx.amount);

      // Update transaction status
      await this.walletTransactionRepository.updateStatus(pendingTx.id, pendingTx.sellerId, 'Completed');

      return StatusBuilder.ok(undefined);
    } catch (error) {
      console.error("releaseSettlement error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to release settlement");
    }
  }

  async cancelSettlement(orderId: string): Promise<ApiResponse<void>> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) return StatusBuilder.fail("Order not found");

      const txs = await this.walletTransactionRepository.getHistoryBySeller(order.sellerId);
      const pendingTx = txs.find(t => t.referenceId === orderId && t.type === 'SETTLEMENT' && t.status === 'Pending');
      
      if (!pendingTx) {
        return StatusBuilder.fail("Pending settlement transaction not found");
      }

      // Decrease pending balance without adding to available
      await this.walletRepository.decreasePendingBalance(order.sellerId, pendingTx.amount);

      // Update transaction status
      await this.walletTransactionRepository.updateStatus(pendingTx.id, pendingTx.sellerId, 'Cancelled');

      return StatusBuilder.ok(undefined);
    } catch (error) {
      console.error("cancelSettlement error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to cancel settlement");
    }
  }

  async createWithdrawalRequest(sellerId: string, amount: number, bankName: string, bankAccount: string, accountHolder: string): Promise<ApiResponse<WithdrawalRequest>> {
    try {
      if (amount <= 0) {
        return StatusBuilder.fail("Amount must be greater than 0");
      }

      // Lock the balance first. This will throw if insufficient balance.
      await this.walletRepository.lockBalance(sellerId, amount);

      const request: WithdrawalRequest = {
        id: crypto.randomUUID(),
        sellerId,
        amount,
        bankName,
        bankAccount,
        accountHolder,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await this.withdrawalRepository.createRequest(request);

      const walletBefore = await this.walletRepository.getWallet(sellerId);
      // Since lockBalance already updated the wallet, we consider the transaction to record the movement
      const transaction: WalletTransaction = {
        id: crypto.randomUUID(),
        sellerId: sellerId,
        type: 'WITHDRAWAL',
        referenceId: request.id,
        amount: -amount,
        balanceBefore: walletBefore.availableBalance + amount, // the available balance before locking
        balanceAfter: walletBefore.availableBalance,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await this.walletTransactionRepository.createTransaction(transaction);

      return StatusBuilder.ok(request);
    } catch (error) {
      console.error("createWithdrawalRequest error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to create withdrawal request");
    }
  }

  async approveWithdrawal(adminId: string, requestId: string): Promise<ApiResponse<void>> {
    try {
      const request = await this.withdrawalRepository.getById(requestId);
      if (!request) {
        return StatusBuilder.fail("Withdrawal request not found");
      }

      if (request.status !== "Pending" && request.status !== "Processing") {
        return StatusBuilder.fail(`Cannot approve request in ${request.status} status`);
      }

      await this.walletRepository.increaseWithdrawnBalance(request.sellerId, request.amount);
      await this.withdrawalRepository.updateStatus(requestId, "Paid");

      // Mark the associated WalletTransaction as Completed
      const txs = await this.walletTransactionRepository.getHistoryBySeller(request.sellerId);
      const pendingTx = txs.find(t => t.referenceId === requestId && t.type === 'WITHDRAWAL');
      if (pendingTx) {
        await this.walletTransactionRepository.updateStatus(pendingTx.id, pendingTx.sellerId, 'Completed');
      }

      return StatusBuilder.ok(undefined);
    } catch (error) {
      console.error("approveWithdrawal error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to approve withdrawal");
    }
  }

  async rejectWithdrawal(adminId: string, requestId: string): Promise<ApiResponse<void>> {
    try {
      const request = await this.withdrawalRepository.getById(requestId);
      if (!request) {
        return StatusBuilder.fail("Withdrawal request not found");
      }

      if (request.status !== "Pending") {
        return StatusBuilder.fail(`Cannot reject request in ${request.status} status`);
      }

      // Return funds from locked to available
      await this.walletRepository.unlockBalance(request.sellerId, request.amount);
      await this.withdrawalRepository.updateStatus(requestId, "Rejected");

      // Cancel the transaction
      const txs = await this.walletTransactionRepository.getHistoryBySeller(request.sellerId);
      const pendingTx = txs.find(t => t.referenceId === requestId && t.type === 'WITHDRAWAL');
      if (pendingTx) {
        await this.walletTransactionRepository.updateStatus(pendingTx.id, pendingTx.sellerId, 'Cancelled');
      }

      return StatusBuilder.ok(undefined);
    } catch (error) {
      console.error("rejectWithdrawal error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to reject withdrawal");
    }
  }

  async getSellerTransactions(sellerId: string): Promise<ApiResponse<WalletTransaction[]>> {
    try {
      const txs = await this.walletTransactionRepository.getHistoryBySeller(sellerId);
      return StatusBuilder.ok(txs);
    } catch (error) {
      console.error("getSellerTransactions error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to get transactions");
    }
  }

  async getSellerWithdrawals(sellerId: string): Promise<ApiResponse<WithdrawalRequest[]>> {
    try {
      const withdrawals = await this.withdrawalRepository.getSellerRequests(sellerId);
      return StatusBuilder.ok(withdrawals);
    } catch (error) {
      console.error("getSellerWithdrawals error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to get withdrawals");
    }
  }

  async getAllPendingWithdrawals(): Promise<ApiResponse<WithdrawalRequest[]>> {
    try {
      const withdrawals = await this.withdrawalRepository.getPendingRequests();
      return StatusBuilder.ok(withdrawals);
    } catch (error) {
      console.error("getAllPendingWithdrawals error:", error);
      return StatusBuilder.fail(error instanceof Error ? error.message : "Failed to get pending withdrawals");
    }
  }
}
