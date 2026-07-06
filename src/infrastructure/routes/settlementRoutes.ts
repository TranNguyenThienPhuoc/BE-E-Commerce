import { Hono } from "hono";
import { SettlementController } from "@/adapters/controllers/SettlementController";
import { SettlementUseCase } from "@/application/usecases/SettlementUseCase";
import { WalletRepository } from "@/adapters/repositories/WalletRepository";
import { WalletTransactionRepository } from "@/adapters/repositories/WalletTransactionRepository";
import { WithdrawalRepository } from "@/adapters/repositories/WithdrawalRepository";
import { OrderRepository } from "@/adapters/repositories/OrderRepository";
import { requireAuth, requireRoles } from "@/infrastructure/middleware/auth";
import { initializeSettlementWorker } from "@/infrastructure/events/settlementWorker";

const orderRepository = new OrderRepository();
const walletRepository = new WalletRepository();
const walletTransactionRepository = new WalletTransactionRepository();
const withdrawalRepository = new WithdrawalRepository();

const settlementUseCase = new SettlementUseCase(
  orderRepository,
  walletRepository,
  walletTransactionRepository,
  withdrawalRepository
);

// Initialize event listeners
initializeSettlementWorker(settlementUseCase);

const settlementController = new SettlementController(settlementUseCase);

export function setupSettlementRoutes(app: Hono) {
  const settlementRoutes = new Hono();

  // All wallet routes require authentication and Seller role
  settlementRoutes.use("/*", requireAuth(), requireRoles(["seller", "admin"]));

  // Seller APIs
  settlementRoutes.get("/wallet", (c) => settlementController.getWallet(c));
  settlementRoutes.get("/wallet/transactions", (c) => settlementController.getSellerTransactions(c));
  settlementRoutes.get("/wallet/withdrawals", (c) => settlementController.getSellerWithdrawals(c));
  settlementRoutes.post("/wallet/withdraw", (c) => settlementController.requestWithdrawal(c));

  // Admin APIs (In a real app, separate these to /admin/withdrawals or add admin role check)
  settlementRoutes.get("/admin/withdrawals", requireRoles(["admin"]), (c) => settlementController.getPendingWithdrawals(c));
  settlementRoutes.post("/admin/withdrawals/:id/approve", requireRoles(["admin"]), (c) => settlementController.approveWithdrawal(c));
  settlementRoutes.post("/admin/withdrawals/:id/reject", requireRoles(["admin"]), (c) => settlementController.rejectWithdrawal(c));

  app.route("/api/settlements", settlementRoutes);
}
