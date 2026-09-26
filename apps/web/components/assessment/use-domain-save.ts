"use client";

import { useState } from "react";
import { assessmentCreateSchema, validateWithSchema, type AssessmentDomain } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";

/** Empty inputs mean "not recorded", so they're dropped rather than stored as "". */
export function pruneEmpty<T extends Record<string, unknown>>(values: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = pruneEmpty(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out as Partial<T>;
}

/**
 * Saves one domain of an assessment. Each domain is its own row, so a dietitian
 * can complete the stages in any order and save progress as they go.
 */
export function useDomainSave(patientId: string, domain: AssessmentDomain, onSaved: () => void) {
  const { token } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const save = async (data: unknown) => {
    setError(null);
    setSuccess(false);

    const validation = validateWithSchema(assessmentCreateSchema, { patientId, domain, data });
    if (!validation.success) {
      const cleanErrors: Record<string, string> = {};
      for (const [key, msg] of Object.entries(validation.errors)) {
        const fieldName = key.startsWith("data.") ? key.replace("data.", "") : key;
        cleanErrors[fieldName] = msg;
      }
      setFieldErrors(cleanErrors);
      setError(validation.firstError);
      return false;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/assessments", { method: "POST", token, body: validation.data });
      setSuccess(true);
      onSaved();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          const cleanErrors: Record<string, string> = {};
          for (const [key, msg] of Object.entries(err.fieldErrors)) {
            const fieldName = key.startsWith("data.") ? key.replace("data.", "") : key;
            cleanErrors[fieldName] = msg;
          }
          setFieldErrors((prev) => ({ ...prev, ...cleanErrors }));
        }
      } else {
        setError("Failed to save assessment.");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { save, error, success, submitting, fieldErrors, clearFieldError, setFieldErrors };
}
