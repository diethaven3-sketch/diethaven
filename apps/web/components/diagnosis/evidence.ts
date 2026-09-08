import { LAB_REFERENCES, type DiagnosisEvidence, type LabFlag, type LabMarker } from "@repo/types";
import type { AssessmentRow } from "../assessment/domain-history";
import { fieldLabel, formatFieldValue } from "../assessment/field-labels";

export interface EvidenceOption extends DiagnosisEvidence {
  /** Stable identity for selection state — one assessment row plus one field. */
  key: string;
  recordedAt: string;
  /** Abnormal labs sort first, since they are what usually justifies a diagnosis. */
  abnormal: boolean;
}

interface LabValue {
  marker: LabMarker;
  value: number;
  unit: string;
  flag: LabFlag;
}

const SKIPPED_FIELDS = new Set(["testDate"]);

/**
 * Flattens a patient's assessment rows into individually citable data points, so
 * a PES statement can record exactly which findings served as its
 * signs/symptoms evidence (guideline §4.2.2).
 */
export function buildEvidenceOptions(assessments: AssessmentRow[]): EvidenceOption[] {
  const options: EvidenceOption[] = [];

  for (const assessment of assessments) {
    const base = { assessmentId: assessment.id, domain: assessment.domain, recordedAt: assessment.date };

    if (assessment.domain === "BIOCHEMICAL") {
      const values = (assessment.domainData.values as LabValue[] | undefined) ?? [];
      for (const value of values) {
        const reference = LAB_REFERENCES[value.marker];
        const abnormal = value.flag !== "NORMAL";
        options.push({
          ...base,
          key: `${assessment.id}:${value.marker}`,
          field: value.marker,
          label: reference?.label ?? value.marker,
          value: `${value.value} ${value.unit}${abnormal ? ` (${value.flag.toLowerCase()})` : ""}`,
          abnormal,
        });
      }
      continue;
    }

    for (const [field, raw] of Object.entries(assessment.domainData)) {
      if (SKIPPED_FIELDS.has(field) || raw === null || raw === undefined || raw === "") continue;

      // Vital signs are nested; cite each reading on its own.
      if (field === "vitalSigns" && typeof raw === "object") {
        for (const [vitalField, vitalValue] of Object.entries(raw as Record<string, unknown>)) {
          options.push({
            ...base,
            key: `${assessment.id}:${vitalField}`,
            field: vitalField,
            label: fieldLabel(vitalField),
            value: formatFieldValue(vitalValue).slice(0, 500),
            abnormal: false,
          });
        }
        continue;
      }

      options.push({
        ...base,
        key: `${assessment.id}:${field}`,
        field,
        label: fieldLabel(field),
        value: formatFieldValue(raw).slice(0, 500),
        abnormal: false,
      });
    }
  }

  return options.sort((a, b) => Number(b.abnormal) - Number(a.abnormal));
}

/** The evidence phrasing a dietitian would otherwise retype into signs/symptoms. */
export function evidenceToSentence(selected: EvidenceOption[]): string {
  return selected.map((item) => `${item.label} of ${item.value}`).join(", ");
}
