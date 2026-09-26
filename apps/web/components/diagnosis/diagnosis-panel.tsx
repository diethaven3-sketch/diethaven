"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  DIAGNOSIS_DOMAIN_LABELS,
  DIAGNOSIS_LIBRARY,
  DIAGNOSIS_STATUS_LABELS,
  diagnosisCreateSchema,
  formatPesStatement,
  validateWithSchema,
  type DiagnosisDomain,
  type DiagnosisEvidence,
  type DiagnosisStatus,
} from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../ui/button";
import { Banner } from "../ui/banner";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Field } from "../ui/input";
import { SelectField } from "../ui/select";
import { TextareaField } from "../ui/textarea";
import type { AssessmentRow } from "../assessment/domain-history";
import { buildEvidenceOptions, evidenceToSentence, type EvidenceOption } from "./evidence";

export interface DiagnosisRow {
  id: string;
  domain: DiagnosisDomain;
  problemCode: string | null;
  problem: string;
  etiology: string;
  signsSymptoms: string;
  evidence: DiagnosisEvidence[];
  status: DiagnosisStatus;
  aiGenerated: boolean;
  createdAt: string;
}

const DOMAINS = Object.keys(DIAGNOSIS_DOMAIN_LABELS) as DiagnosisDomain[];
const statusTone = { ACTIVE: "info", RESOLVED: "success", RULED_OUT: "neutral" } as const;
const FREE_TEXT = "__free_text__";

function EvidencePicker({
  options,
  selected,
  onToggle,
}: {
  options: EvidenceOption[];
  selected: Set<string>;
  onToggle: (option: EvidenceOption) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-body">
        No assessment data recorded yet. Complete an assessment domain first and its findings become citable here.
      </p>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
      <ul className="divide-y divide-gray-100">
        {options.map((option) => (
          <li key={option.key}>
            <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-surface">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(option.key)}
                onChange={() => onToggle(option)}
              />
              <span className="flex-1 text-sm">
                <span className="font-medium text-heading">{option.label}</span>
                <span className="text-body"> — {option.value}</span>
              </span>
              {option.abnormal ? <Badge tone="warning">Outside range</Badge> : null}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiagnosisForm({
  patientId,
  assessments,
  onSaved,
}: {
  patientId: string;
  assessments: AssessmentRow[];
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [domain, setDomain] = useState<DiagnosisDomain>("INTAKE");
  const [problemChoice, setProblemChoice] = useState("");
  const [customProblem, setCustomProblem] = useState("");
  const [etiology, setEtiology] = useState("");
  const [signsSymptoms, setSignsSymptoms] = useState("");
  const [selected, setSelected] = useState<Map<string, EvidenceOption>>(new Map());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const evidenceOptions = useMemo(() => buildEvidenceOptions(assessments), [assessments]);
  const libraryTerms = DIAGNOSIS_LIBRARY.filter((term) => term.domain === domain);

  const selectedTerm = libraryTerms.find((term) => term.code === problemChoice);
  const problem = problemChoice === FREE_TEXT ? customProblem : (selectedTerm?.label ?? "");
  const problemCode = problemChoice === FREE_TEXT ? undefined : selectedTerm?.code;

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleEvidence = (option: EvidenceOption) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(option.key)) next.delete(option.key);
      else next.set(option.key, option);
      return next;
    });
  };

  const applyEvidenceToText = () => {
    const sentence = evidenceToSentence([...selected.values()]);
    if (sentence) {
      setSignsSymptoms(sentence);
      clearFieldError("signsSymptoms");
    }
  };

  const reset = () => {
    setProblemChoice("");
    setCustomProblem("");
    setEtiology("");
    setSignsSymptoms("");
    setSelected(new Map());
    setFieldErrors({});
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const evidence: DiagnosisEvidence[] = [...selected.values()].map(
      ({ assessmentId, domain: evidenceDomain, field, label, value }) => ({
        assessmentId,
        domain: evidenceDomain,
        field,
        label,
        value,
      }),
    );
    // Only set assessmentId when every citation came from the same assessment;
    // a diagnosis drawn from several rows stays linked through evidence instead.
    const assessmentIds = new Set(evidence.map((item) => item.assessmentId));

    const payload = {
      patientId,
      domain,
      problem: problem.trim(),
      problemCode,
      etiology: etiology.trim(),
      signsSymptoms: signsSymptoms.trim(),
      evidence,
      ...(assessmentIds.size === 1 ? { assessmentId: [...assessmentIds][0] } : {}),
    };

    const validation = validateWithSchema(diagnosisCreateSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/diagnoses", { method: "POST", token, body: validation.data });
      reset();
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Failed to save diagnosis.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">New nutrition diagnosis</h3>
      <p className="mt-1 text-sm text-body">
        Recorded as an IDNT PES statement: problem, etiology, and the signs and symptoms that evidence it.
      </p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="IDNT domain"
            name="domain"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value as DiagnosisDomain);
              setProblemChoice("");
              clearFieldError("domain");
            }}
          >
            {DOMAINS.map((value) => (
              <option key={value} value={value}>
                {DIAGNOSIS_DOMAIN_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Problem (diagnostic label)"
            name="problem"
            value={problemChoice}
            onChange={(e) => {
              setProblemChoice(e.target.value);
              clearFieldError("problem");
            }}
            error={fieldErrors.problem}
            required
          >
            <option value="">Select a problem…</option>
            {libraryTerms.map((term) => (
              <option key={term.code} value={term.code}>
                {term.code} · {term.label}
              </option>
            ))}
            <option value={FREE_TEXT}>Other (enter manually)</option>
          </SelectField>
        </div>

        {problemChoice === FREE_TEXT ? (
          <Field
            label="Problem"
            name="customProblem"
            value={customProblem}
            onChange={(e) => {
              setCustomProblem(e.target.value);
              clearFieldError("problem");
            }}
            error={fieldErrors.problem}
            required
          />
        ) : null}

        <Field
          label="Etiology (related to)"
          name="etiology"
          value={etiology}
          onChange={(e) => {
            setEtiology(e.target.value);
            clearFieldError("etiology");
          }}
          placeholder="limited nutrition-related knowledge"
          error={fieldErrors.etiology}
          required
        />

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-heading">Evidence from the assessment</legend>
          <p className="mb-3 text-xs text-body">
            Tick the findings this diagnosis rests on. They are stored with the diagnosis so it stays traceable back
            to the data that justified it.
          </p>
          <EvidencePicker options={evidenceOptions} selected={new Set(selected.keys())} onToggle={toggleEvidence} />
          {selected.size > 0 ? (
            <Button type="button" variant="outline" className="mt-3" onClick={applyEvidenceToText}>
              Use {selected.size} selected as signs &amp; symptoms
            </Button>
          ) : null}
        </fieldset>

        <TextareaField
          label="Signs & symptoms (as evidenced by)"
          name="signsSymptoms"
          value={signsSymptoms}
          onChange={(e) => {
            setSignsSymptoms(e.target.value);
            clearFieldError("signsSymptoms");
          }}
          error={fieldErrors.signsSymptoms}
          required
        />

        {problem && etiology && signsSymptoms ? (
          <div className="rounded-lg bg-surface-alt p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-dark">PES statement</p>
            <p className="mt-1 text-sm text-heading">{formatPesStatement({ problem, etiology, signsSymptoms })}</p>
          </div>
        ) : null}

        <Button type="submit" loading={submitting} className="self-start">
          Save diagnosis
        </Button>
      </form>
    </Card>
  );
}

function DiagnosisCard({ diagnosis, onChanged }: { diagnosis: DiagnosisRow; onChanged: () => void }) {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: DiagnosisStatus) => {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/diagnoses/${diagnosis.id}`, { method: "PATCH", token, body: { status } });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update diagnosis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{DIAGNOSIS_DOMAIN_LABELS[diagnosis.domain]}</Badge>
          {diagnosis.problemCode ? <Badge tone="neutral">{diagnosis.problemCode}</Badge> : null}
          <Badge tone={statusTone[diagnosis.status]}>{DIAGNOSIS_STATUS_LABELS[diagnosis.status]}</Badge>
        </div>
        <p className="text-xs text-body">Recorded {new Date(diagnosis.createdAt).toLocaleDateString()}</p>
      </div>

      <p className="mt-3 text-sm text-heading">
        {formatPesStatement({
          problem: diagnosis.problem,
          etiology: diagnosis.etiology,
          signsSymptoms: diagnosis.signsSymptoms,
        })}
      </p>

      {diagnosis.evidence.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-body">Evidence</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {diagnosis.evidence.map((item, index) => (
              <li key={`${item.assessmentId}-${item.field}-${index}`} className="rounded-full bg-surface px-3 py-1 text-xs text-body">
                {item.label}: {item.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <Banner tone="danger" className="mt-3">
          {error}
        </Banner>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {diagnosis.status !== "ACTIVE" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("ACTIVE")}>
            Reopen
          </Button>
        ) : null}
        {diagnosis.status !== "RESOLVED" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("RESOLVED")}>
            Mark resolved
          </Button>
        ) : null}
        {diagnosis.status !== "RULED_OUT" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("RULED_OUT")}>
            Rule out
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function DiagnosisPanel({
  patientId,
  assessments,
  diagnoses,
  onChanged,
}: {
  patientId: string;
  assessments: AssessmentRow[];
  diagnoses: DiagnosisRow[] | null;
  onChanged: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DiagnosisForm patientId={patientId} assessments={assessments} onSaved={onChanged} />

      <div>
        <h3 className="text-lg font-bold text-heading">Recorded diagnoses</h3>
        <div className="mt-3 flex flex-col gap-4">
          {diagnoses === null ? (
            <p className="text-sm text-body">Loading…</p>
          ) : diagnoses.length === 0 ? (
            <Card>
              <p className="text-sm text-body">No diagnoses recorded for this patient yet.</p>
            </Card>
          ) : (
            diagnoses.map((diagnosis) => (
              <DiagnosisCard key={diagnosis.id} diagnosis={diagnosis} onChanged={onChanged} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
