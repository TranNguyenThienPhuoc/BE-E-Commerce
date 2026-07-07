import { z } from "zod";
import {
  BaseEntityFields,
  entityDateRefinement,
  atLeastOneFieldRefinement,
} from "./entity";
import { NonEmptyStringSchema, EmailSchema } from "./common";

export const supportTicketStatusEnum = z.enum(["open", "in-progress", "resolved", "closed"]);
export const supportTicketPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const SupportTicketSchema = z
  .object({
    ...BaseEntityFields,
    customerName: NonEmptyStringSchema.max(100),
    customerEmail: EmailSchema,
    subject: NonEmptyStringSchema.max(200),
    message: NonEmptyStringSchema.max(2000),
    status: supportTicketStatusEnum.default("open"),
    priority: supportTicketPriorityEnum.default("medium"),
    category: NonEmptyStringSchema.max(100).default("General"),
    // If a logged-in user sends this, we can store their ID
    customerId: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(...entityDateRefinement);

export const CreateSupportTicketSchema = z.object({
  customerName: NonEmptyStringSchema.max(100, "Tên không được vượt quá 100 ký tự"),
  customerEmail: EmailSchema,
  subject: NonEmptyStringSchema.max(200, "Tiêu đề không được vượt quá 200 ký tự"),
  message: NonEmptyStringSchema.max(2000, "Nội dung không được vượt quá 2000 ký tự"),
  customerId: z.string().optional(),
});

export const UpdateSupportTicketSchema = z
  .object({
    status: supportTicketStatusEnum.optional(),
    priority: supportTicketPriorityEnum.optional(),
    category: NonEmptyStringSchema.max(100).optional(),
    replyMessage: z.string().max(2000).optional(), // For admin replying
  })
  .refine(...atLeastOneFieldRefinement);

export type SupportTicket = z.infer<typeof SupportTicketSchema>;
export type CreateSupportTicketRequest = z.infer<typeof CreateSupportTicketSchema>;
export type UpdateSupportTicketRequest = z.infer<typeof UpdateSupportTicketSchema>;
export type SupportTicketStatus = z.infer<typeof supportTicketStatusEnum>;
export type SupportTicketPriority = z.infer<typeof supportTicketPriorityEnum>;
