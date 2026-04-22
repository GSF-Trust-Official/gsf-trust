import { z } from "zod";

export const CreateMemberSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  join_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  is_bod: z.boolean().default(false),
  bod_designation: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateMemberSchema = CreateMemberSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
