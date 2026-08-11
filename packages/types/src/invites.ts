import { z } from "zod";

export const sexSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Sex = z.infer<typeof sexSchema>;

export const inviteRequestSchema = z.object({
  email: z.string().email(),
});
export type InviteRequestInput = z.infer<typeof inviteRequestSchema>;

export const acceptInviteSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  dateOfBirth: z.string().date(),
  sex: sexSchema,
  contact: z.string().optional(),
  consentAccepted: z.literal(true),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
