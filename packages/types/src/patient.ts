import { z } from "zod";
import { sexSchema } from "./invites";

/**
 * Fields a patient may correct on their own clinical profile. `consentStatus`
 * is deliberately absent — withdrawing consent is a records process handled by
 * the dietitian, not a self-service profile edit.
 */
export const updatePatientProfileSchema = z.object({
  dateOfBirth: z.string().date("Please enter a valid date of birth (YYYY-MM-DD)").optional(),
  sex: sexSchema.optional(),
  contact: z.string().trim().max(100).optional(),
});
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
