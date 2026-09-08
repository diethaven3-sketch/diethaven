"use client";

import { useState } from "react";
import { assessmentCreateSchema, type AssessmentDomain } from "@repo/types";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const save = async (data: unknown) => {
    setError(null);
    setSuccess(false);

    const parsed = assessmentCreateSchema.safeParse({ patientId, domain, data });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue ? `${issue.path.slice(2).join(".") || "Form"}: ${issue.message}` : "Check the form and retry.");
      return false;
    }

    setSubmitting(true);
    try {
      await apiFetch("/assessments", { method: "POST", token, body: parsed.data });
      setSuccess(true);
      onSaved();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save assessment.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { save, error, success, submitting };
}
