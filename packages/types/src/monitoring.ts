import { z } from "zod";
import { LAB_REFERENCES, flagLabValue, type LabFlag } from "./lab-ranges";
import type { LabMarker } from "./assessments";

export const outcomeStatusSchema = z.enum(["RESOLVED", "IMPROVED", "UNCHANGED", "WORSENED"], {
  message: "Please select a visit outcome",
});
export type OutcomeStatus = z.infer<typeof outcomeStatusSchema>;

export const OUTCOME_STATUS_LABELS: Record<OutcomeStatus, string> = {
  RESOLVED: "Resolved",
  IMPROVED: "Improved",
  UNCHANGED: "Unchanged",
  WORSENED: "Worsened",
};

export const followUpCreateSchema = z
  .object({
    patientId: z.string({ message: "Patient ID is required" }).min(1, "Patient ID is required"),
    diagnosisId: z.string().min(1).optional(),
    interventionId: z.string().min(1).optional(),
    outcome: outcomeStatusSchema,
    notes: z.string({ message: "Visit notes are required" }).trim().min(1, "Record what happened at this visit").max(5000),
  })
  // A follow-up that reviews nothing has no anchor in the care history, which
  // is the whole point of the record.
  .refine((value) => Boolean(value.diagnosisId || value.interventionId), {
    message: "Link the visit to the diagnosis or intervention it reviews",
    path: ["diagnosisId"],
  });
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;

export const followUpUpdateSchema = z
  .object({
    outcome: outcomeStatusSchema.optional(),
    notes: z.string().trim().min(1, "Visit notes cannot be empty").max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });
export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;

export const followUpsQuerySchema = z.object({
  patientId: z.string({ message: "Patient ID is required" }).min(1, "Patient ID is required"),
});
export type FollowUpsQuery = z.infer<typeof followUpsQuerySchema>;

// ---------------------------------------------------------------------------
// Trends derived from Assessment rows
//
// Weight, BMI and lab values are not stored a second time for monitoring. The
// assessment series already holds them with dates attached, so trends are
// computed from it — one source of truth for "what is this patient's weight".
// ---------------------------------------------------------------------------

export interface AnthropometricPoint {
  date: string;
  height: number;
  weight: number;
  bmi: number;
}

export interface LabPoint {
  date: string;
  value: number;
  flag: LabFlag;
}

export interface LabTrend {
  marker: LabMarker;
  label: string;
  unit: string;
  low: number;
  high: number;
  points: LabPoint[];
  latest: LabPoint | null;
}

/**
 * Extracts and sorts anthropometric rows into a dated series. Returns an
 * empty list when no anthropometric rows exist.
 */
export function anthropometricTrend(
  assessments: Array<{ domain: string; date: string; domainData: unknown }>,
): AnthropometricPoint[] {
  return assessments
    .filter((a) => a.domain === "ANTHROPOMETRIC")
    .map((a) => {
      const data = a.domainData as { height?: number; weight?: number; bmi?: number } | null;
      if (!data?.height || !data?.weight || !data?.bmi) return null;
      return { date: a.date, height: data.height, weight: data.weight, bmi: data.bmi };
    })
    .filter((p): p is AnthropometricPoint => p !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * First-to-latest comparison for weight and BMI. Returns null when fewer
 * than two data points exist (no trend to summarise).
 */
export function weightSummary(points: AnthropometricPoint[]) {
  if (points.length < 2) return null;
  const first = points[0]!;
  const latest = points[points.length - 1]!;
  const weightChange = Math.round((latest.weight - first.weight) * 10) / 10;
  const bmiChange = Math.round((latest.bmi - first.bmi) * 10) / 10;
  return { first, latest, weightChange, bmiChange };
}

/**
 * Groups laboratory assessment results by marker into a sorted time series
 * per marker, with each point flagged against its reference range.
 */
export function labTrends(
  assessments: Array<{ domain: string; date: string; domainData: unknown }>,
): LabTrend[] {
  const byMarker = new Map<LabMarker, LabPoint[]>();

  for (const a of assessments) {
    if (a.domain !== "BIOCHEMICAL") continue;
    const data = a.domainData as { values?: Array<{ marker: LabMarker; value: number }> } | null;
    if (!data?.values) continue;
    for (const entry of data.values) {
      if (typeof entry.value !== "number" || Number.isNaN(entry.value)) continue;
      const ref = LAB_REFERENCES[entry.marker];
      if (!ref) continue;
      const point: LabPoint = {
        date: a.date,
        value: entry.value,
        flag: flagLabValue(entry.marker, entry.value),
      };
      const list = byMarker.get(entry.marker) ?? [];
      list.push(point);
      byMarker.set(entry.marker, list);
    }
  }

  const trends: LabTrend[] = [];
  for (const [marker, points] of byMarker.entries()) {
    const ref = LAB_REFERENCES[marker];
    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    trends.push({
      marker,
      label: ref.label,
      unit: ref.unit,
      low: ref.low,
      high: ref.high,
      points,
      latest: points[points.length - 1] ?? null,
    });
  }

  return trends.sort((a, b) => a.label.localeCompare(b.label));
}
