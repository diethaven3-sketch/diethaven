import { z } from "zod";

export const dietitianApprovalStatusSchema = z.enum(["APPROVED", "REJECTED", "SUSPENDED"]);
export type DietitianApprovalStatusInput = z.infer<typeof dietitianApprovalStatusSchema>;

export const updateDietitianStatusSchema = z.object({
  status: dietitianApprovalStatusSchema,
});
export type UpdateDietitianStatusInput = z.infer<typeof updateDietitianStatusSchema>;

export const listDietitiansQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
});
export type ListDietitiansQuery = z.infer<typeof listDietitiansQuerySchema>;
