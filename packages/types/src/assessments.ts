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
const note = z.string().trim().max(4000, "Notes cannot exceed 4000 characters").optional();

export const patientHistoryDataSchema = z.object({
  personalSocialHistory: note,
  medicalHistory: note,
  familyHistory: note,
  medicationHistory: note,
});
export type PatientHistoryData = z.infer<typeof patientHistoryDataSchema>;

/** Height in cm, weight in kg. BMI is derived server-side, never sent by the client. */
export const anthropometricDataSchema = z.object({
  height: z
    .number({ message: "Height must be a valid number" })
    .positive("Height must be greater than 0")
    .max(300, "Height must be at most 300 cm"),
  weight: z
    .number({ message: "Weight must be a valid number" })
    .positive("Weight must be greater than 0")
    .max(700, "Weight must be at most 700 kg"),
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
  testDate: z
    .string({ message: "Test date is required" })
    .date("Please enter a valid test date (YYYY-MM-DD)"),
  values: z
    .array(
      z.object({
        marker: labMarkerSchema,
        value: z
          .number({ message: "Value must be a number" })
          .nonnegative("Value cannot be negative"),
      }),
    )
    .min(1, "Record at least one lab value")
    // One row per marker, so a result can't be recorded twice with different values.
    .refine((rows) => new Set(rows.map((r) => r.marker)).size === rows.length, {
      message: "Each lab marker can only appear once per panel",
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
      systolic: z
        .number({ message: "Systolic BP must be a number" })
        .positive("Must be greater than 0")
        .max(300, "Max 300 mmHg")
        .optional(),
      diastolic: z
        .number({ message: "Diastolic BP must be a number" })
        .positive("Must be greater than 0")
        .max(200, "Max 200 mmHg")
        .optional(),
      pulse: z
        .number({ message: "Pulse must be a number" })
        .positive("Must be greater than 0")
        .max(300, "Max 300 bpm")
        .optional(),
      temperature: z
        .number({ message: "Temperature must be a number" })
        .positive("Must be greater than 0")
        .max(50, "Max 50 °C")
        .optional(),
      respiratoryRate: z
        .number({ message: "Respiratory rate must be a number" })
        .positive("Must be greater than 0")
        .max(100, "Max 100 breaths/min")
        .optional(),
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

const withPatient = {
  patientId: z.string({ message: "Patient ID is required" }).min(1, "Patient ID is required"),
};

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
  patientId: z.string({ message: "Patient ID is required" }).min(1, "Patient ID is required"),
  /** Omit to get every domain, newest first. */
  domain: assessmentDomainSchema.optional(),
});
export type AssessmentsQuery = z.infer<typeof assessmentsQuerySchema>;
