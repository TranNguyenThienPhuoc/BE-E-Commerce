import { ApiResponse } from "@/utils";
import { WalletTransaction, WithdrawalRequest, SellerWallet } from "@/utils/schemas/settlement";

export interface ISettlementUseCase {
  getWallet(sellerId: string): Promise<ApiResponse<SellerWallet>>;
  processSettlement(orderId: string): Promise<ApiResponse<WalletTransaction>>;
  releaseSettlement(orderId: string): Promise<ApiResponse<void>>;
  cancelSettlement(orderId: string): Promise<ApiResponse<void>>;
  
  createWithdrawalRequest(sellerId: string, amount: number, bankName: string, bankAccount: string, accountHolder: string): Promise<ApiResponse<WithdrawalRequest>>;
  approveWithdrawal(adminId: string, requestId: string): Promise<ApiResponse<void>>;
  rejectWithdrawal(adminId: string, requestId: string): Promise<ApiResponse<void>>;
  
  getSellerTransactions(sellerId: string): Promise<ApiResponse<WalletTransaction[]>>;
  getSellerWithdrawals(sellerId: string): Promise<ApiResponse<WithdrawalRequest[]>>;
  getAllPendingWithdrawals(): Promise<ApiResponse<WithdrawalRequest[]>>;
}
