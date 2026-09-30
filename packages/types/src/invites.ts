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
  verificationCode: z
    .string({ message: "Enter the code we emailed you" })
    .trim()
    .regex(/^\d{6}$/, "The verification code is 6 digits"),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

/**
 * An invite as the dietitian who sent it sees it. `status` is EXPIRED once
 * `expiresAt` passes even if the row still says PENDING, and the share link is
 * only returned while the invite can still be accepted.
 */
export interface InviteListItem {
  id: string;
  email: string;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  inviteUrl: string | null;
  code: string | null;
}

export interface InviteCreated {
  id: string;
  email: string;
  expiresAt: string;
  inviteUrl: string;
  code: string;
}

/** Deep link into the patient app's accept-invite screen. */
export function inviteAppLink(code: string) {
  return `diethaven://accept-invite?token=${encodeURIComponent(code)}`;
}

/** Public preview of an invite. The email is masked: the link alone shouldn't reveal it. */
export interface InvitePreview {
  maskedEmail: string;
  dietitianName: string;
  expired: boolean;
}

export interface InviteVerificationSent {
  maskedEmail: string;
  /** Seconds before another code can be requested. */
  resendAfterSeconds: number;
}

/** "adaeze@gmail.com" -> "ad****@gmail.com". */
export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
