import { z } from "zod";

export const LogPayoutSchema = z.object({
  beneficiary_name:  z.string().min(1).max(200),
  member_id:         z.string().optional(),
  academic_year:     z.string().min(4).max(20),
  amount:            z.number().positive("Amount must be positive"),
  eligibility_notes: z.string().max(500).optional(),
  paid_on:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export const AnnouncementSchema = z.object({
  id:                   z.string().optional(),
  title:                z.string().min(1).max(200),
  description:          z.string().min(1).max(2000),
  eligibility_criteria: z.string().max(1000).optional(),
  deadline:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  contact:              z.string().max(200).optional(),
  poster_drive_url:     z.string().url().nullable().optional(),
  documents_drive_url:  z.string().url().nullable().optional(),
  form_url:             z
    .string()
    .url()
    .nullable()
    .optional()
    .refine(
      (v) => !v || v.startsWith("https://docs.google.com/forms/"),
      { message: "Must be a Google Forms URL (https://docs.google.com/forms/…)" }
    ),
  is_active: z.boolean().default(false),
});
