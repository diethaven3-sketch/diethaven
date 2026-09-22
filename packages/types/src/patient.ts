import { z } from "zod";
import { sexSchema } from "./invites";

/**
 * Fields a patient may correct on their own clinical profile. `consentStatus`
 * is deliberately absent — withdrawing consent is a records process handled by
 * the dietitian, not a self-service profile edit.
 */
export const updatePatientProfileSchema = z.object({
  dateOfBirth: z.string().date().optional(),
  sex: sexSchema.optional(),
  contact: z.string().optional(),
});
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
