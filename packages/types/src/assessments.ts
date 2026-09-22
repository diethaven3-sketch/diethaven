import { z } from "zod";

export const assessmentDomainSchema = z.enum([
  "ANTHROPOMETRIC",
  "BIOCHEMICAL",
  "CLINICAL_PHYSICAL",
  "DIETARY",
  "ENVIRONMENTAL",
  "PATIENT_HISTORY",
]);
export type AssessmentDomain = z.infer<typeof assessmentDomainSchema>;

export const ASSESSMENT_DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  PATIENT_HISTORY: "Patient History",
  ANTHROPOMETRIC: "Anthropometric",
  BIOCHEMICAL: "Biochemical / Laboratory",
  CLINICAL_PHYSICAL: "Nutrition-Focused Physical",
  DIETARY: "Dietary / Food & Nutrition History",
  ENVIRONMENTAL: "Environmental / Lifestyle",
};

/** IDNT domain order, as the guideline lists them. Drives tab order in the UI. */
export const ASSESSMENT_DOMAIN_ORDER: AssessmentDomain[] = [
  "PATIENT_HISTORY",
  "ANTHROPOMETRIC",
  "BIOCHEMICAL",
  "CLINICAL_PHYSICAL",
  "DIETARY",
  "ENVIRONMENTAL",
];

// ---------------------------------------------------------------------------
// Per-domain payloads
// ---------------------------------------------------------------------------

/** Free-text clinical narrative. Trimmed, and capped so a stray paste can't bloat a row. */
const note = z.string().trim().max(4000).optional();

export const patientHistoryDataSchema = z.object({
  personalSocialHistory: note,
  medicalHistory: note,
  familyHistory: note,
  medicationHistory: note,
});
export type PatientHistoryData = z.infer<typeof patientHistoryDataSchema>;

/** Height in cm, weight in kg. BMI is derived server-side, never sent by the client. */
export const anthropometricDataSchema = z.object({
  height: z.number().positive().max(300),
  weight: z.number().positive().max(700),
});
export type AnthropometricData = z.infer<typeof anthropometricDataSchema>;

export const labMarkerSchema = z.enum([
  "FASTING_GLUCOSE",
  "HBA1C",
  "TOTAL_CHOLESTEROL",
  "LDL_CHOLESTEROL",
  "HDL_CHOLESTEROL",
  "TRIGLYCERIDES",
  "CREATININE",
  "UREA",
  "ALT",
  "AST",
  "ALBUMIN",
  "HAEMOGLOBIN",
  "SODIUM",
  "POTASSIUM",
]);
export type LabMarker = z.infer<typeof labMarkerSchema>;

export const biochemicalDataSchema = z.object({
  testDate: z.string().date(),
  values: z
    .array(z.object({ marker: labMarkerSchema, value: z.number() }))
    .min(1, "Record at least one lab value")
    // One row per marker, so a result can't be recorded twice with different values.
    .refine((rows) => new Set(rows.map((r) => r.marker)).size === rows.length, {
      message: "Each lab marker can only appear once",
    }),
  notes: note,
});
export type BiochemicalData = z.infer<typeof biochemicalDataSchema>;

export const wastingSchema = z.enum(["NONE", "MILD", "MODERATE", "SEVERE"]);
export const swallowingSchema = z.enum(["NORMAL", "MILD_DIFFICULTY", "MODERATE_DIFFICULTY", "SEVERE_DIFFICULTY"]);

export const clinicalPhysicalDataSchema = z.object({
  physicalAppearance: note,
  muscleWasting: wastingSchema.optional(),
  fatWasting: wastingSchema.optional(),
  swallowingFunction: swallowingSchema.optional(),
  oralHealth: note,
  vitalSigns: z
    .object({
      systolic: z.number().positive().max(300).optional(),
      diastolic: z.number().positive().max(200).optional(),
      pulse: z.number().positive().max(300).optional(),
      temperature: z.number().positive().max(50).optional(),
      respiratoryRate: z.number().positive().max(100).optional(),
    })
    .optional(),
});
export type ClinicalPhysicalData = z.infer<typeof clinicalPhysicalDataSchema>;

export const intakeMethodSchema = z.enum(["RECALL_24H", "FOOD_FREQUENCY"]);

export const dietaryDataSchema = z.object({
  intakeMethod: intakeMethodSchema.optional(),
  usualIntake: note,
  mealPattern: note,
  preferences: note,
  aversions: note,
  allergies: note,
  culturalReligiousPractices: note,
  supplementUse: note,
});
export type DietaryData = z.infer<typeof dietaryDataSchema>;

export const foodSecuritySchema = z.enum(["SECURE", "MILD", "MODERATE", "SEVERE"]);
export const activityLevelSchema = z.enum(["SEDENTARY", "LIGHT", "MODERATE", "VIGOROUS"]);

export const environmentalDataSchema = z.object({
  livingSituation: note,
  foodSecurity: foodSecuritySchema.optional(),
  physicalActivityLevel: activityLevelSchema.optional(),
  occupation: note,
  socioeconomicFactors: note,
});
export type EnvironmentalData = z.infer<typeof environmentalDataSchema>;

// ---------------------------------------------------------------------------
// Create / query
// ---------------------------------------------------------------------------

const withPatient = { patientId: z.string().min(1) };

/**
 * One assessment row per domain, so a dietitian can save each stage of the
 * assessment independently rather than completing one long form.
 */
export const assessmentCreateSchema = z.discriminatedUnion("domain", [
  z.object({ ...withPatient, domain: z.literal("PATIENT_HISTORY"), data: patientHistoryDataSchema }),
  z.object({ ...withPatient, domain: z.literal("ANTHROPOMETRIC"), data: anthropometricDataSchema }),
  z.object({ ...withPatient, domain: z.literal("BIOCHEMICAL"), data: biochemicalDataSchema }),
  z.object({ ...withPatient, domain: z.literal("CLINICAL_PHYSICAL"), data: clinicalPhysicalDataSchema }),
  z.object({ ...withPatient, domain: z.literal("DIETARY"), data: dietaryDataSchema }),
  z.object({ ...withPatient, domain: z.literal("ENVIRONMENTAL"), data: environmentalDataSchema }),
]);
export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;

export const assessmentsQuerySchema = z.object({
  patientId: z.string().min(1),
  /** Omit to get every domain, newest first. */
  domain: assessmentDomainSchema.optional(),
});
export type AssessmentsQuery = z.infer<typeof assessmentsQuerySchema>;
