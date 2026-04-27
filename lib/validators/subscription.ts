import { z } from "zod";

export const LogSubscriptionSchema = z.object({
  member_id: z.string().min(1, "Member is required"),
  month:     z.number().int().min(1).max(12),
  year:      z.number().int().min(2020).max(2100),
  amount:    z.number().min(1, "Amount must be greater than 0").default(300),
  paid_date: z.string().min(1, "Payment date is required"),
  mode:      z.enum(["upi", "bank", "cash"]),
  reference: z.string().nullable().optional(),
  notes:     z.string().nullable().optional(),
});

export type LogSubscriptionInput = z.infer<typeof LogSubscriptionSchema>;

export const BulkMarkPaidSchema = z.object({
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2020).max(2100),
  member_ids: z.array(z.string().min(1)).min(1, "At least one member required"),
  paid_date:  z.string().min(1),
  mode:       z.enum(["upi", "bank", "cash"]),
  amount:     z.number().min(1).default(300),
});

export type BulkMarkPaidInput = z.infer<typeof BulkMarkPaidSchema>;
