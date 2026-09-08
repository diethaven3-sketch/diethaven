/** Field-name → human label, shared by the assessment history and the evidence picker. */
export const FIELD_LABELS: Record<string, string> = {
  personalSocialHistory: "Personal & social history",
  medicalHistory: "Medical & health history",
  familyHistory: "Family history",
  medicationHistory: "Treatment & medication history",
  height: "Height",
  weight: "Weight",
  bmi: "BMI",
  physicalAppearance: "Physical appearance",
  muscleWasting: "Muscle wasting",
  fatWasting: "Fat wasting",
  swallowingFunction: "Swallowing function",
  oralHealth: "Oral health",
  vitalSigns: "Vital signs",
  intakeMethod: "Intake method",
  usualIntake: "Usual intake",
  mealPattern: "Meal pattern",
  preferences: "Food preferences",
  aversions: "Food aversions",
  allergies: "Allergies & intolerances",
  culturalReligiousPractices: "Cultural & religious practices",
  supplementUse: "Supplement use",
  livingSituation: "Living situation",
  foodSecurity: "Food security",
  physicalActivityLevel: "Physical activity level",
  occupation: "Occupation",
  socioeconomicFactors: "Socioeconomic factors",
  systolic: "Systolic",
  diastolic: "Diastolic",
  pulse: "Pulse",
  temperature: "Temperature",
  respiratoryRate: "Respiratory rate",
  notes: "Notes",
  testDate: "Test date",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** Enum values are stored as SCREAMING_SNAKE; show them as prose. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
      return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
    }
    return value;
  }
  return String(value);
}
