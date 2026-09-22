/** Shapes returned by the patient-facing API endpoints, plus display helpers. */

export interface AnthropometricAssessment {
  id: string;
  date: string;
  domain: "ANTHROPOMETRIC";
  /** Height in cm, weight in kg, BMI already rounded by the API. */
  domainData: { height: number; weight: number; bmi: number };
}

export interface LinkedDietitian {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dietitianProfile: { specialty: string; facility: string } | null;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "DIETITIAN" | "PATIENT";
  createdAt: string;
}

/** The patient's own clinical profile, from GET /patient/profile. */
export interface PatientClinicalProfile {
  id: string;
  dateOfBirth: string;
  sex: "MALE" | "FEMALE" | "OTHER";
  contact: string | null;
  consentStatus: boolean;
  consentGivenAt: string | null;
  createdAt: string;
}

const SEX_LABELS: Record<PatientClinicalProfile["sex"], string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export function sexLabel(sex: PatientClinicalProfile["sex"]): string {
  return SEX_LABELS[sex];
}

/**
 * WHO adult BMI categories. Informational only — this is a restatement of the
 * dietitian-entered number, not a clinical assessment of the patient.
 */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/**
 * ISO datetime → the "YYYY-MM-DD" form the API's date schemas expect. Slices the
 * raw string rather than round-tripping through Date, which would shift the day
 * for any timezone behind UTC.
 */
export function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Change between the two most recent measurements, in kg. Assessments arrive
 * newest-first from the API. Null when there's nothing to compare against.
 */
export function weightChange(assessments: AnthropometricAssessment[]): number | null {
  if (assessments.length < 2) return null;
  return Math.round((assessments[0].domainData.weight - assessments[1].domainData.weight) * 10) / 10;
}

export function formatWeightChange(change: number): string {
  if (change === 0) return "No change since last visit";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)} kg since last visit`;
}
