import { z } from "zod";
import { sexSchema } from "./invites";

export const dietitianRegisterSchema = z.object({
  name: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, "Full name is required")
    .max(100, "Name is too long"),
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters long"),
  phone: z.string().trim().max(30).optional(),
  licenseNumber: z
    .string({ message: "License number is required" })
    .trim()
    .min(1, "License number is required")
    .max(50, "License number is too long"),
  specialty: z
    .string({ message: "Clinical specialty is required" })
    .trim()
    .min(1, "Clinical specialty is required")
    .max(100, "Specialty is too long"),
  facility: z
    .string({ message: "Facility / Practice name is required" })
    .trim()
    .min(1, "Facility / Practice name is required")
    .max(150, "Facility name is too long"),
});
export type DietitianRegisterInput = z.infer<typeof dietitianRegisterSchema>;

export const loginSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  code: z
    .string({ message: "Verification code is required" })
    .trim()
    .length(6, "Verification code must be exactly 6 digits"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name is too long").optional(),
  phone: z.string().trim().max(30).optional(),
  avatarUrl: z.string().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: z
    .string({ message: "New password is required" })
    .min(8, "New password must be at least 8 characters long"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const patientRegisterSchema = z.object({
  name: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, "Full name is required")
    .max(100, "Name is too long"),
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
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
export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string({ message: "Email address is required" })
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  code: z
    .string({ message: "Reset code is required" })
    .trim()
    .length(6, "Reset code must be exactly 6 digits"),
  newPassword: z
    .string({ message: "New password is required" })
    .min(8, "New password must be at least 8 characters long"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
