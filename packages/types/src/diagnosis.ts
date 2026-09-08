import { z } from "zod";

export const diagnosisDomainSchema = z.enum(["INTAKE", "CLINICAL", "BEHAVIORAL_ENVIRONMENTAL"]);
export type DiagnosisDomain = z.infer<typeof diagnosisDomainSchema>;

export const DIAGNOSIS_DOMAIN_LABELS: Record<DiagnosisDomain, string> = {
  INTAKE: "Intake",
  CLINICAL: "Clinical",
  BEHAVIORAL_ENVIRONMENTAL: "Behavioral-Environmental",
};

export const diagnosisStatusSchema = z.enum(["ACTIVE", "RESOLVED", "RULED_OUT"]);
export type DiagnosisStatus = z.infer<typeof diagnosisStatusSchema>;

export const DIAGNOSIS_STATUS_LABELS: Record<DiagnosisStatus, string> = {
  ACTIVE: "Active",
  RESOLVED: "Resolved",
  RULED_OUT: "Ruled out",
};

export interface DiagnosisTerm {
  code: string;
  label: string;
  domain: DiagnosisDomain;
}

/**
 * Curated starter set of IDNT nutrition-diagnosis terms, grouped by the three
 * IDNT domains (guideline §4.2.2).
 *
 * This is a WORKING SUBSET, not the complete reference. The full IDNT
 * terminology is published and licensed by the Academy of Nutrition and
 * Dietetics and runs to several hundred terms; codes and wording should be
 * checked against the current licensed edition before clinical use. Dietitians
 * are never limited to this list — the diagnosis form accepts a free-text
 * problem for anything not represented here.
 */
export const DIAGNOSIS_LIBRARY: DiagnosisTerm[] = [
  // Intake (NI) — energy, nutrient, and fluid intake relative to needs.
  { code: "NI-1.2", label: "Inadequate energy intake", domain: "INTAKE" },
  { code: "NI-1.3", label: "Excessive energy intake", domain: "INTAKE" },
  { code: "NI-2.1", label: "Inadequate oral intake", domain: "INTAKE" },
  { code: "NI-2.2", label: "Excessive oral intake", domain: "INTAKE" },
  { code: "NI-3.1", label: "Inadequate fluid intake", domain: "INTAKE" },
  { code: "NI-5.1", label: "Increased nutrient needs", domain: "INTAKE" },
  { code: "NI-5.4", label: "Decreased nutrient needs", domain: "INTAKE" },
  { code: "NI-5.6.2", label: "Excessive fat intake", domain: "INTAKE" },
  { code: "NI-5.7.1", label: "Inadequate protein intake", domain: "INTAKE" },
  { code: "NI-5.8.2", label: "Excessive carbohydrate intake", domain: "INTAKE" },
  { code: "NI-5.8.4", label: "Inconsistent carbohydrate intake", domain: "INTAKE" },
  { code: "NI-5.10.1", label: "Inadequate mineral intake", domain: "INTAKE" },

  // Clinical (NC) — nutrition problems tied to a medical or physical condition.
  { code: "NC-1.1", label: "Swallowing difficulty", domain: "CLINICAL" },
  { code: "NC-1.4", label: "Altered GI function", domain: "CLINICAL" },
  { code: "NC-2.1", label: "Impaired nutrient utilization", domain: "CLINICAL" },
  { code: "NC-2.2", label: "Altered nutrition-related laboratory values", domain: "CLINICAL" },
  { code: "NC-3.1", label: "Underweight", domain: "CLINICAL" },
  { code: "NC-3.2", label: "Unintended weight loss", domain: "CLINICAL" },
  { code: "NC-3.3", label: "Overweight or obesity", domain: "CLINICAL" },
  { code: "NC-3.4", label: "Unintended weight gain", domain: "CLINICAL" },

  // Behavioral-Environmental (NB) — knowledge, beliefs, access, and behaviour.
  { code: "NB-1.1", label: "Food and nutrition-related knowledge deficit", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-1.2", label: "Unsupported beliefs about food or nutrition", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-1.3", label: "Not ready for diet or lifestyle change", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-1.5", label: "Disordered eating pattern", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-1.7", label: "Undesirable food choices", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-2.1", label: "Physical inactivity", domain: "BEHAVIORAL_ENVIRONMENTAL" },
  { code: "NB-3.2", label: "Limited access to food", domain: "BEHAVIORAL_ENVIRONMENTAL" },
];

/**
 * One assessment field cited as evidence for a PES statement, so an accepted
 * diagnosis stays traceable back to the data that justified it (guideline §4.2.2).
 */
export const diagnosisEvidenceSchema = z.object({
  assessmentId: z.string().min(1),
  domain: z.string().min(1),
  field: z.string().min(1),
  label: z.string().min(1),
  value: z.string().max(500),
});
export type DiagnosisEvidence = z.infer<typeof diagnosisEvidenceSchema>;

export const diagnosisCreateSchema = z.object({
  patientId: z.string().min(1),
  /** The assessment the evidence was drawn from, when it all came from one. */
  assessmentId: z.string().min(1).optional(),
  domain: diagnosisDomainSchema,
  problemCode: z.string().max(20).optional(),
  problem: z.string().trim().min(1, "Select or enter a problem").max(300),
  etiology: z.string().trim().min(1, "Describe the etiology (related to)").max(1000),
  signsSymptoms: z.string().trim().min(1, "Describe the signs and symptoms").max(2000),
  evidence: z.array(diagnosisEvidenceSchema).max(50).default([]),
});
export type DiagnosisCreateInput = z.infer<typeof diagnosisCreateSchema>;

/** Editing a saved diagnosis, including changing its status. */
export const diagnosisUpdateSchema = z
  .object({
    domain: diagnosisDomainSchema.optional(),
    problemCode: z.string().max(20).nullable().optional(),
    problem: z.string().trim().min(1).max(300).optional(),
    etiology: z.string().trim().min(1).max(1000).optional(),
    signsSymptoms: z.string().trim().min(1).max(2000).optional(),
    status: diagnosisStatusSchema.optional(),
    evidence: z.array(diagnosisEvidenceSchema).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });
export type DiagnosisUpdateInput = z.infer<typeof diagnosisUpdateSchema>;

export const diagnosesQuerySchema = z.object({
  patientId: z.string().min(1),
  status: diagnosisStatusSchema.optional(),
});
export type DiagnosesQuery = z.infer<typeof diagnosesQuerySchema>;

/** The IDNT full-sentence form: "[Problem] related to [Etiology] as evidenced by [Signs/Symptoms]." */
export function formatPesStatement(parts: {
  problem: string;
  etiology: string;
  signsSymptoms: string;
}): string {
  return `${parts.problem} related to ${parts.etiology} as evidenced by ${parts.signsSymptoms}.`;
}
