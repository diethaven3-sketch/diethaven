import type { LabMarker } from "./assessments";

export type LabFlag = "LOW" | "NORMAL" | "HIGH";

export interface LabReference {
  label: string;
  unit: string;
  /** Inclusive bounds of the normal range. */
  low: number;
  high: number;
}

/**
 * Standard adult reference ranges, used to flag results for the dietitian's
 * attention during assessment.
 *
 * These are advisory defaults, NOT a clinical source of truth: real ranges vary
 * by laboratory, assay, sex, age, and pregnancy status. A flag here means "look
 * at this", never "this is a diagnosis" — the guideline is explicit that flags
 * support the dietitian's judgement rather than replace it. Where a lab reports
 * its own range, that range wins.
 */
export const LAB_REFERENCES: Record<LabMarker, LabReference> = {
  FASTING_GLUCOSE: { label: "Fasting blood glucose", unit: "mg/dL", low: 70, high: 99 },
  HBA1C: { label: "HbA1c", unit: "%", low: 4, high: 5.6 },
  TOTAL_CHOLESTEROL: { label: "Total cholesterol", unit: "mg/dL", low: 0, high: 199 },
  LDL_CHOLESTEROL: { label: "LDL cholesterol", unit: "mg/dL", low: 0, high: 99 },
  HDL_CHOLESTEROL: { label: "HDL cholesterol", unit: "mg/dL", low: 40, high: 200 },
  TRIGLYCERIDES: { label: "Triglycerides", unit: "mg/dL", low: 0, high: 149 },
  CREATININE: { label: "Creatinine", unit: "mg/dL", low: 0.6, high: 1.3 },
  UREA: { label: "Urea (BUN)", unit: "mg/dL", low: 7, high: 20 },
  ALT: { label: "ALT", unit: "U/L", low: 7, high: 56 },
  AST: { label: "AST", unit: "U/L", low: 10, high: 40 },
  ALBUMIN: { label: "Albumin", unit: "g/dL", low: 3.5, high: 5 },
  HAEMOGLOBIN: { label: "Haemoglobin", unit: "g/dL", low: 12, high: 17 },
  SODIUM: { label: "Sodium", unit: "mmol/L", low: 135, high: 145 },
  POTASSIUM: { label: "Potassium", unit: "mmol/L", low: 3.5, high: 5.1 },
};

export function flagLabValue(marker: LabMarker, value: number): LabFlag {
  const reference = LAB_REFERENCES[marker];
  if (value < reference.low) return "LOW";
  if (value > reference.high) return "HIGH";
  return "NORMAL";
}
