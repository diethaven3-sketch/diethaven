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

export interface AdminRecentAction {
  id: string;
  action: "CREATE" | "UPDATE" | "VIEW";
  entityType: string;
  entityId: string;
  timestamp: string;
  user: { id: string; name: string; role: string };
}

export interface AdminStats {
  dietitians: Record<string, number>;
  invites: Record<string, number>;
  /** PENDING invites whose link has lapsed (the row isn't rewritten on expiry). */
  lapsedInvites: number;
  patientCount: number;
  assessmentCount: number;
  /** New accounts per week (weeks start Monday, UTC), oldest first. */
  signups: { weekStart: string; dietitians: number; patients: number }[];
  /** Audit events per day, oldest first. `changes` = creates + updates. */
  activity: { date: string; changes: number; views: number }[];
  /** Latest creates/updates. Views are left out: they'd drown everything else. */
  recentActions: AdminRecentAction[];
}
