import { z } from "zod";

export const CreateCaseSchema = z.object({
  beneficiary_name: z.string().min(1).max(200),
  mask_name:        z.boolean().default(false),
  amount_requested: z.number().positive("Amount must be positive"),
  opened_at:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  description:      z.string().max(1000).optional(),
  notes:            z.string().max(1000).optional(),
});

export const UpdateCaseSchema = z.object({
  amount_paid:     z.number().min(0).optional(),
  amount_external: z.number().min(0).optional(),
  notes:           z.string().max(1000).nullable().optional(),
  close:           z.boolean().optional(),
});
