import { adherenceByDay, averageAdherence, plannedExchanges, type FoodLogItem } from "./food-log";
import type { Meal } from "./intervention";
import { anthropometricTrend, labTrends, type OutcomeStatus } from "./monitoring";

// ---------------------------------------------------------------------------
// Dietitian dashboard overview
//
// A caseload-level summary of every linked patient, derived from the same
// Assessment / FoodLog / FollowUp records the per-patient tabs use. Nothing
// here is stored: it is recomputed on each read, so it can't drift from the
// underlying clinical data.
//
// The "needs attention" reasons are fixed, rule-based checks — NOT AI and NOT
// a clinical risk score. Each one is a prompt to look at the patient, stated in
// plain terms so the dietitian can see exactly why it fired.
// ---------------------------------------------------------------------------

/** Days of food-diary history the overview looks at. */
export const OVERVIEW_WINDOW_DAYS = 14;
/** Days without a diary entry before a previously-logging patient is flagged. */
export const LOGGING_GAP_DAYS = 3;
/** Seven-day average adherence below this is flagged. */
export const LOW_ADHERENCE_PERCENT = 50;

export type BmiCategory = "UNDERWEIGHT" | "HEALTHY" | "OVERWEIGHT" | "OBESE";

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  UNDERWEIGHT: "Underweight",
  HEALTHY: "Healthy",
  OVERWEIGHT: "Overweight",
  OBESE: "Obese",
};

export const BMI_CATEGORY_ORDER: BmiCategory[] = ["UNDERWEIGHT", "HEALTHY", "OVERWEIGHT", "OBESE"];

/** WHO adult cut-offs. Advisory only — BMI says nothing about body composition. */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 25) return "HEALTHY";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESE";
}

export type AttentionReason =
  | "NO_ASSESSMENT"
  | "NEVER_LOGGED"
  | "LOGGING_GAP"
  | "LOW_ADHERENCE"
  | "LABS_OUT_OF_RANGE"
  | "WORSENED";

export interface PatientOverview {
  userId: string;
  name: string;
  email: string;
  sex: string;
  dateOfBirth: string;
  linkedAt: string;
  /** Anthropometric series, oldest first — the last few points, for sparklines. */
  weightSeries: { date: string; weight: number; bmi: number }[];
  latestWeight: number | null;
  latestBmi: number | null;
  bmiCategory: BmiCategory | null;
  /** First-to-latest weight change in kg; null with fewer than two readings. */
  weightChange: number | null;
  labsOutOfRange: string[];
  activeDiagnoses: number;
  activeInterventions: number;
  hasMealPlan: boolean;
  lastLogAt: string | null;
  daysLogged7: number;
  /** Average adherence over the last 7 days against the active meal plan. */
  adherence7: number | null;
  lastFollowUp: { date: string; outcome: OutcomeStatus } | null;
  attention: AttentionReason[];
}

export interface DietitianOverview {
  generatedAt: string;
  totals: {
    patients: number;
    pendingInvites: number;
    activeDiagnoses: number;
    activeInterventions: number;
    loggedToday: number;
    needsAttention: number;
  };
  /** Distinct patients who logged each day, oldest first, OVERVIEW_WINDOW_DAYS long. */
  loggingActivity: { date: string; patients: number; entries: number }[];
  bmiDistribution: { category: BmiCategory; patients: number }[];
  /** Latest follow-up outcome per patient. */
  outcomeDistribution: { outcome: OutcomeStatus; patients: number }[];
  patients: PatientOverview[];
}

export interface OverviewPatientInput {
  userId: string;
  dateOfBirth: Date | string;
  sex: string;
  createdAt: Date | string;
  user: { name: string; email: string };
}

export interface OverviewInput {
  now: Date;
  patients: OverviewPatientInput[];
  pendingInvites: number;
  assessments: { patientId: string; domain: string; date: Date | string; domainData: unknown }[];
  activeDiagnosisCounts: Map<string, number>;
  /** ACTIVE interventions, newest first. */
  activeInterventions: { patientId: string; meals: Meal[] | null }[];
  /** Latest follow-up per patient. */
  latestFollowUps: { patientId: string; date: Date | string; outcome: OutcomeStatus }[];
  /** Food logs within the overview window, plus each patient's most recent log. */
  foodLogs: { patientId: string; date: Date | string; items: unknown }[];
  lastLogAt: Map<string, Date>;
}

const OUTCOME_ORDER: OutcomeStatus[] = ["RESOLVED", "IMPROVED", "UNCHANGED", "WORSENED"];
const DAY_MS = 24 * 60 * 60 * 1000;

function iso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** ISO dates (UTC) for the last `days` days, oldest first, ending today. */
function windowDays(now: Date, days: number) {
  return Array.from({ length: days }, (_, i) => dayKey(new Date(now.getTime() - (days - 1 - i) * DAY_MS)));
}

function groupBy<T extends { patientId: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.patientId) ?? [];
    list.push(row);
    map.set(row.patientId, list);
  }
  return map;
}

export function buildDietitianOverview(input: OverviewInput): DietitianOverview {
  const { now } = input;
  const days = windowDays(now, OVERVIEW_WINDOW_DAYS);
  const last7 = new Set(days.slice(-7));
  const today = days[days.length - 1]!;

  const assessmentsByPatient = groupBy(input.assessments);
  const logsByPatient = groupBy(input.foodLogs);
  const followUpByPatient = new Map(input.latestFollowUps.map((f) => [f.patientId, f]));

  const activeInterventionCounts = new Map<string, number>();
  const activeMeals = new Map<string, Meal[]>();
  for (const intervention of input.activeInterventions) {
    activeInterventionCounts.set(intervention.patientId, (activeInterventionCounts.get(intervention.patientId) ?? 0) + 1);
    // Same rule as the Monitoring tab: the most recent active plan wins.
    if (intervention.meals && !activeMeals.has(intervention.patientId)) {
      activeMeals.set(intervention.patientId, intervention.meals);
    }
  }

  const patients: PatientOverview[] = input.patients.map((p) => {
    const assessments = (assessmentsByPatient.get(p.userId) ?? []).map((a) => ({
      domain: a.domain,
      date: iso(a.date),
      domainData: a.domainData,
    }));
    const anthro = anthropometricTrend(assessments);
    const latest = anthro[anthro.length - 1] ?? null;
    const first = anthro[0] ?? null;
    const labs = labTrends(assessments);
    const labsOutOfRange = labs.filter((t) => t.latest && t.latest.flag !== "NORMAL").map((t) => t.label);

    const logs = (logsByPatient.get(p.userId) ?? []).map((l) => ({
      date: iso(l.date),
      items: (Array.isArray(l.items) ? l.items : []) as FoodLogItem[],
    }));
    const recentLogs = logs.filter((l) => last7.has(l.date.slice(0, 10)));
    const daysLogged7 = new Set(recentLogs.map((l) => l.date.slice(0, 10))).size;
    const meals = activeMeals.get(p.userId) ?? null;
    const adherence7 = meals ? averageAdherence(adherenceByDay(recentLogs, plannedExchanges(meals))) : null;

    const lastLog = input.lastLogAt.get(p.userId) ?? null;
    const followUp = followUpByPatient.get(p.userId);

    const attention: AttentionReason[] = [];
    if (assessments.length === 0) attention.push("NO_ASSESSMENT");
    if (!lastLog) {
      attention.push("NEVER_LOGGED");
    } else if (now.getTime() - lastLog.getTime() > LOGGING_GAP_DAYS * DAY_MS) {
      attention.push("LOGGING_GAP");
    }
    if (adherence7 !== null && adherence7 < LOW_ADHERENCE_PERCENT) attention.push("LOW_ADHERENCE");
    if (labsOutOfRange.length > 0) attention.push("LABS_OUT_OF_RANGE");
    if (followUp?.outcome === "WORSENED") attention.push("WORSENED");

    return {
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      sex: p.sex,
      dateOfBirth: iso(p.dateOfBirth),
      linkedAt: iso(p.createdAt),
      weightSeries: anthro.slice(-10).map((pt) => ({ date: pt.date, weight: pt.weight, bmi: pt.bmi })),
      latestWeight: latest?.weight ?? null,
      latestBmi: latest?.bmi ?? null,
      bmiCategory: latest ? bmiCategory(latest.bmi) : null,
      weightChange:
        latest && first && anthro.length > 1 ? Math.round((latest.weight - first.weight) * 10) / 10 : null,
      labsOutOfRange,
      activeDiagnoses: input.activeDiagnosisCounts.get(p.userId) ?? 0,
      activeInterventions: activeInterventionCounts.get(p.userId) ?? 0,
      hasMealPlan: meals !== null,
      lastLogAt: lastLog ? lastLog.toISOString() : null,
      daysLogged7,
      adherence7,
      lastFollowUp: followUp ? { date: iso(followUp.date), outcome: followUp.outcome } : null,
      attention,
    };
  });

  const loggingActivity = days.map((date) => {
    const dayLogs = input.foodLogs.filter((l) => iso(l.date).slice(0, 10) === date);
    return { date, patients: new Set(dayLogs.map((l) => l.patientId)).size, entries: dayLogs.length };
  });

  return {
    generatedAt: now.toISOString(),
    totals: {
      patients: patients.length,
      pendingInvites: input.pendingInvites,
      activeDiagnoses: patients.reduce((sum, p) => sum + p.activeDiagnoses, 0),
      activeInterventions: patients.reduce((sum, p) => sum + p.activeInterventions, 0),
      loggedToday: loggingActivity.find((d) => d.date === today)?.patients ?? 0,
      needsAttention: patients.filter((p) => p.attention.length > 0).length,
    },
    loggingActivity,
    bmiDistribution: BMI_CATEGORY_ORDER.map((category) => ({
      category,
      patients: patients.filter((p) => p.bmiCategory === category).length,
    })),
    outcomeDistribution: OUTCOME_ORDER.map((outcome) => ({
      outcome,
      patients: patients.filter((p) => p.lastFollowUp?.outcome === outcome).length,
    })),
    patients,
  };
}
