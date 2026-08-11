import { z } from "zod";

export const assessmentCreateSchema = z.object({
  patientId: z.string().min(1),
  // Centimeters and kilograms.
  height: z.number().positive(),
  weight: z.number().positive(),
});
export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;

export const assessmentsQuerySchema = z.object({
  patientId: z.string().min(1),
});
export type AssessmentsQuery = z.infer<typeof assessmentsQuerySchema>;
