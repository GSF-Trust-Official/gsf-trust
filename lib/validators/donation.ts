import { z } from "zod";

export const LogDonationSchema = z.object({
  member_id:  z.string().optional(),
  donor_name: z.string().min(1, "Donor name is required").max(200),
  type:       z.enum(["hadiya", "zakat", "other"]),
  category:   z.enum(["general", "medical", "scholarship", "emergency"]),
  amount:     z.number().positive("Amount must be positive"),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  mode:       z.string().optional(),
  reference:  z.string().optional(),
  notes:      z.string().optional(),
}).refine(
  (d) => d.type !== "zakat" || d.category === "scholarship",
  { message: "Zakat donations must be categorized as Scholarship", path: ["category"] }
);
