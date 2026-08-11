import { z } from "zod";

export const auditActionSchema = z.enum(["CREATE", "UPDATE", "VIEW"]);

export const auditLogsQuerySchema = z.object({
  entityType: z.string().min(1).optional(),
  action: auditActionSchema.optional(),
  userId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
});
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
