import { z } from "zod";

export const sexSchema = z.enum(["MALE", "FEMALE", "OTHER"], {
  message: "Please select a biological sex",
});
export type Sex = z.infer<typeof sexSchema>;

export const inviteRequestSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});
export type InviteRequestInput = z.infer<typeof inviteRequestSchema>;

export const acceptInviteSchema = z.object({
  name: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, "Full name is required")
    .max(100, "Name is too long"),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters long"),
  phone: z.string().trim().max(30).optional(),
  dateOfBirth: z
    .string({ message: "Date of birth is required" })
    .date("Please enter a valid date of birth (YYYY-MM-DD)"),
  sex: sexSchema,
  contact: z.string().trim().max(100).optional(),
  consentAccepted: z.literal(true, {
    message: "You must accept the informed consent to continue",
  }),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
