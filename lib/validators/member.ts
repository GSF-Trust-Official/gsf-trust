import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().max(max).nullable()
  );

export const CreateMemberSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code too long").trim(),
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  email: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().email("Invalid email address").nullable()
  ),
  phone: optionalString(20),
  address: optionalString(500),
  join_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  is_bod: z.boolean().default(false),
  bod_designation: optionalString(100),
  notes: optionalString(1000),
});

export const UpdateMemberSchema = CreateMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
