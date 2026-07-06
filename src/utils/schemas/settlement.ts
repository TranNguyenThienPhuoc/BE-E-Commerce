import { z } from 'zod';
import { PositiveNumberSchema, NonEmptyStringSchema } from './common';

export const SellerWalletSchema = z.object({
  sellerId: NonEmptyStringSchema,
  availableBalance: z.number().min(0).default(0),
  pendingBalance: z.number().min(0).default(0),
  lockedBalance: z.number().min(0).default(0),
  withdrawnBalance: z.number().min(0).default(0),
  currency: z.string().default('VND'),
  updatedAt: z.string().datetime().optional(),
});

export type SellerWallet = z.infer<typeof SellerWalletSchema>;

export const TransactionTypeSchema = z.enum([
  'SETTLEMENT',
  'WITHDRAWAL',
  'REFUND',
  'ADJUSTMENT'
]);

export const TransactionStatusSchema = z.enum([
  'Pending',
  'Completed',
  'Cancelled',
  'Failed',
]);

export const WalletTransactionSchema = z.object({
  id: NonEmptyStringSchema,
  sellerId: NonEmptyStringSchema,
  type: TransactionTypeSchema,
  referenceId: NonEmptyStringSchema, // orderId or withdrawalId
  amount: z.number(), // positive or negative
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  status: TransactionStatusSchema.default('Pending'),
  createdAt: z.string().datetime().optional(),
});

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

export const WithdrawalStatusSchema = z.enum([
  'Pending',
  'Approved',
  'Processing',
  'Paid',
  'Rejected',
  'Cancelled',
]);

export const WithdrawalRequestSchema = z.object({
  id: NonEmptyStringSchema,
  sellerId: NonEmptyStringSchema,
  amount: PositiveNumberSchema,
  bankName: NonEmptyStringSchema,
  bankAccount: NonEmptyStringSchema,
  accountHolder: NonEmptyStringSchema,
  note: z.string().optional(),
  status: WithdrawalStatusSchema.default('Pending'),
  createdAt: z.string().datetime().optional(),
  processedAt: z.string().datetime().optional(),
});

export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;
