import { z } from "zod";
import { LAB_REFERENCES, flagLabValue, type LabFlag } from "./lab-ranges";
import type { LabMarker } from "./assessments";

export const outcomeStatusSchema = z.enum(["RESOLVED", "IMPROVED", "UNCHANGED", "WORSENED"]);
export type OutcomeStatus = z.infer<typeof outcomeStatusSchema>;

export const OUTCOME_STATUS_LABELS: Record<OutcomeStatus, string> = {
  RESOLVED: "Resolved",
  IMPROVED: "Improved",
  UNCHANGED: "Unchanged",
  WORSENED: "Worsened",
};

export const followUpCreateSchema = z
  .object({
    patientId: z.string().min(1),
    diagnosisId: z.string().min(1).optional(),
    interventionId: z.string().min(1).optional(),
    outcome: outcomeStatusSchema,
    notes: z.string().trim().min(1, "Record what happened at this visit").max(5000),
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
    notes: z.string().trim().min(1).max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });
export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;

export const followUpsQuerySchema = z.object({
  patientId: z.string().min(1),
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
  referenceLow: number;
  referenceHigh: number;
  /** Oldest first, so a chart or table reads left to right through time. */
  points: LabPoint[];
  latest: LabPoint;
  /** Change from the first recorded value to the latest, or null with one point. */
  change: number | null;
}

interface AssessmentLike {
  date: string;
  domain: string;
  domainData: Record<string, unknown>;
}

interface StoredLabValue {
  marker: LabMarker;
  value: number;
  flag?: LabFlag;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Anthropometric series, oldest first. */
export function anthropometricTrend(assessments: AssessmentLike[]): AnthropometricPoint[] {
  return assessments
    .filter((a) => a.domain === "ANTHROPOMETRIC")
    .map((a) => ({
      date: a.date,
      height: Number(a.domainData.height),
      weight: Number(a.domainData.weight),
      bmi: Number(a.domainData.bmi),
    }))
    .filter((point) => Number.isFinite(point.weight) && Number.isFinite(point.bmi))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * One trend per lab marker the patient has results for, each compared against
 * its reference range (guideline §4.2.4: "trend view of key labs over multiple
 * visits, compared against target ranges").
 */
export function labTrends(assessments: AssessmentLike[]): LabTrend[] {
  const byMarker = new Map<LabMarker, LabPoint[]>();

  for (const assessment of assessments) {
    if (assessment.domain !== "BIOCHEMICAL") continue;
    const values = (assessment.domainData.values as StoredLabValue[] | undefined) ?? [];
    // The lab's own test date is the clinically meaningful one; fall back to
    // when the row was recorded if it is missing.
    const date = (assessment.domainData.testDate as string | undefined) ?? assessment.date;

    for (const value of values) {
      if (!LAB_REFERENCES[value.marker] || !Number.isFinite(value.value)) continue;
      const points = byMarker.get(value.marker) ?? [];
      points.push({ date, value: value.value, flag: value.flag ?? flagLabValue(value.marker, value.value) });
      byMarker.set(value.marker, points);
    }
  }

  const trends: LabTrend[] = [];
  for (const [marker, points] of byMarker) {
    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const reference = LAB_REFERENCES[marker];
    const first = points[0];
    const latest = points[points.length - 1];
    if (!first || !latest) continue;

    trends.push({
      marker,
      label: reference.label,
      unit: reference.unit,
      referenceLow: reference.low,
      referenceHigh: reference.high,
      points,
      latest,
      change: points.length > 1 ? round1(latest.value - first.value) : null,
    });
  }

  // Markers currently outside their range first — those are what a follow-up
  // visit needs to look at.
  return trends.sort((a, b) => {
    const aAbnormal = a.latest.flag !== "NORMAL" ? 0 : 1;
    const bAbnormal = b.latest.flag !== "NORMAL" ? 0 : 1;
    return aAbnormal - bAbnormal || a.label.localeCompare(b.label);
  });
}

export interface WeightSummary {
  first: AnthropometricPoint;
  latest: AnthropometricPoint;
  weightChange: number;
  bmiChange: number;
}

/** First-to-latest change, for the headline of a progress report. */
export function weightSummary(points: AnthropometricPoint[]): WeightSummary | null {
  const first = points[0];
  const latest = points[points.length - 1];
  if (!first || !latest || points.length < 2) return null;
  return {
    first,
    latest,
    weightChange: round1(latest.weight - first.weight),
    bmiChange: round1(latest.bmi - first.bmi),
  };
}
