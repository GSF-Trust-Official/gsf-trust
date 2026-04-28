import { z } from "zod";

const GENERAL_CATEGORIES = [
  "Subscription",
  "Donation",
  "Medical Expense",
  "Administrative",
  "Event",
  "Other Income",
  "Other Expense",
] as const;

const ZAKAT_CATEGORIES = ["Scholarship"] as const;

const INTEREST_CATEGORIES = ["Bank Interest", "Distribution to Poor", "Charity Distribution"] as const;

export const LogExpenseSchema = z
  .object({
    account:     z.enum(["general", "zakat"]),
    category:    z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    amount:      z.number().positive("Amount must be positive"),
    date:        z.string().min(1, "Date is required"),
    reference:   z.string().nullable().optional(),
    notes:       z.string().nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.account === "zakat") return d.category === "Scholarship";
      return true;
    },
    { message: "Zakat account can only have Scholarship category", path: ["category"] }
  );

export type LogExpenseInput = z.infer<typeof LogExpenseSchema>;

export const LogInterestSchema = z
  .object({
    type:        z.enum(["credit", "debit"]),
    category:    z.string().min(1),
    description: z.string().min(1, "Description is required"),
    amount:      z.number().positive("Amount must be positive"),
    date:        z.string().min(1, "Date is required"),
    reference:   z.string().nullable().optional(),
    notes:       z.string().nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.type === "credit") return d.category === "Bank Interest";
      return ["Distribution to Poor", "Charity Distribution"].includes(d.category);
    },
    { message: "Invalid category for this interest transaction type", path: ["category"] }
  );

export type LogInterestInput = z.infer<typeof LogInterestSchema>;

export const EditEntrySchema = z.object({
  category:    z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount:      z.number().positive("Amount must be positive"),
  date:        z.string().min(1, "Date is required"),
  reference:   z.string().nullable().optional(),
  notes:       z.string().nullable().optional(),
});

export type EditEntryInput = z.infer<typeof EditEntrySchema>;

export { GENERAL_CATEGORIES, ZAKAT_CATEGORIES, INTEREST_CATEGORIES };
