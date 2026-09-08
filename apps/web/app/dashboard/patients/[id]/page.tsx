"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ASSESSMENT_DOMAIN_LABELS, ASSESSMENT_DOMAIN_ORDER, type AssessmentDomain } from "@repo/types";
import { apiFetch, ApiError } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";
import { RequireRole } from "../../../../components/require-role";
import { AppShell } from "../../../../components/app-shell";
import { Banner } from "../../../../components/ui/banner";
import { DOMAIN_FORMS } from "../../../../components/assessment/domain-forms";
import { DomainHistory, type AssessmentRow } from "../../../../components/assessment/domain-history";

interface PatientDetail {
  userId: string;
  dateOfBirth: string;
  sex: string;
  user: { name: string; email: string };
}

function DomainTabs({
  active,
  counts,
  onSelect,
}: {
  active: AssessmentDomain;
  counts: Record<string, number>;
  onSelect: (domain: AssessmentDomain) => void;
}) {
  return (
    <div className="overflow-x-auto border-b border-gray-200">
      <div role="tablist" aria-label="Assessment domains" className="flex min-w-max gap-1">
        {ASSESSMENT_DOMAIN_ORDER.map((domain) => {
          const selected = domain === active;
          const count = counts[domain] ?? 0;
          return (
            <button
              key={domain}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onSelect(domain)}
              className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                selected
                  ? "border-primary text-primary-dark"
                  : "border-transparent text-body hover:border-gray-300 hover:text-heading"
              }`}
            >
              {ASSESSMENT_DOMAIN_LABELS[domain]}
              {count > 0 ? <span className="ml-2 text-xs text-body">({count})</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PatientDetailView({ patientId }: { patientId: string }) {
  const { token } = useAuth();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<AssessmentDomain>("PATIENT_HISTORY");

  const load = useCallback(async () => {
    try {
      const [patientRes, assessmentsRes] = await Promise.all([
        apiFetch<PatientDetail>(`/dietitian/patients/${patientId}`, { token }),
        apiFetch<AssessmentRow[]>(`/assessments?patientId=${patientId}`, { token }),
      ]);
      setPatient(patientRes);
      setAssessments(assessmentsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load patient.");
    }
  }, [token, patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = assessments ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.domain] = (acc[row.domain] ?? 0) + 1;
    return acc;
  }, {});
  const ActiveForm = DOMAIN_FORMS[activeDomain];

  return (
    <AppShell title={patient ? patient.user.name : "Patient"}>
      {error ? (
        <Banner tone="danger" className="mb-6">
          {error}
        </Banner>
      ) : null}

      {patient ? (
        <p className="mb-6 text-sm text-body">
          {patient.user.email} · DOB {new Date(patient.dateOfBirth).toLocaleDateString()} · {patient.sex}
        </p>
      ) : null}

      <h2 className="text-xl font-bold text-heading">Nutrition assessment</h2>
      <p className="mt-1 text-sm text-body">
        Each domain saves on its own, so you can complete them in any order and come back to the rest later.
      </p>

      <div className="mt-4">
        <DomainTabs active={activeDomain} counts={counts} onSelect={setActiveDomain} />
      </div>

      <div className="mt-6">
        <ActiveForm patientId={patientId} onSaved={load} />
      </div>

      <h3 className="mt-8 text-lg font-bold text-heading">{ASSESSMENT_DOMAIN_LABELS[activeDomain]} history</h3>
      <div className="mt-3">
        {assessments === null ? (
          <p className="text-sm text-body">Loading…</p>
        ) : (
          <DomainHistory domain={activeDomain} entries={rows.filter((row) => row.domain === activeDomain)} />
        )}
      </div>
    </AppShell>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireRole role="DIETITIAN">
      <PatientDetailView patientId={params.id} />
    </RequireRole>
  );
}
