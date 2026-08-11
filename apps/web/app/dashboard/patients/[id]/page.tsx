"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { assessmentCreateSchema } from "@repo/types";
import { apiFetch, ApiError } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";
import { RequireRole } from "../../../../components/require-role";
import { AppShell } from "../../../../components/app-shell";
import { Button } from "../../../../components/ui/button";
import { Banner } from "../../../../components/ui/banner";
import { Card } from "../../../../components/ui/card";
import { Field } from "../../../../components/ui/input";
import { Table, Thead, Tbody, Th, Td } from "../../../../components/ui/table";

interface PatientDetail {
  userId: string;
  dateOfBirth: string;
  sex: string;
  user: { name: string; email: string };
}

interface AssessmentRow {
  id: string;
  date: string;
  domainData: { height: number; weight: number; bmi: number };
}

function AssessmentForm({ patientId, onCreated }: { patientId: string; onCreated: () => void }) {
  const { token } = useAuth();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = assessmentCreateSchema.safeParse({
      patientId,
      height: Number(height),
      weight: Number(weight),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid height and weight.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/assessments", { method: "POST", token, body: parsed.data });
      setHeight("");
      setWeight("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">New anthropometric entry</h3>
      <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit} noValidate>
        <div className="flex-1">
          <Field
            label="Height (cm)"
            type="number"
            inputMode="decimal"
            name="height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Field
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            name="weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
        <Button type="submit" loading={submitting}>
          Save
        </Button>
      </form>
      {error ? (
        <Banner tone="danger" className="mt-3">
          {error}
        </Banner>
      ) : null}
    </Card>
  );
}

function PatientDetailView({ patientId }: { patientId: string }) {
  const { token } = useAuth();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppShell title={patient ? patient.user.name : "Patient"}>
      {error ? <Banner tone="danger" className="mb-6">{error}</Banner> : null}

      {patient ? (
        <p className="mb-6 text-sm text-body">
          {patient.user.email} · DOB {new Date(patient.dateOfBirth).toLocaleDateString()} · {patient.sex}
        </p>
      ) : null}

      <AssessmentForm patientId={patientId} onCreated={load} />

      <h2 className="mt-8 text-xl font-bold text-heading">Weight &amp; BMI history</h2>
      <Card className="mt-3 p-0">
        {assessments === null ? (
          <p className="p-6 text-sm text-body">Loading…</p>
        ) : assessments.length === 0 ? (
          <p className="p-6 text-sm text-body">No anthropometric entries yet.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Height (cm)</Th>
                <Th>Weight (kg)</Th>
                <Th>BMI</Th>
              </tr>
            </Thead>
            <Tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <Td>{new Date(a.date).toLocaleDateString()}</Td>
                  <Td>{a.domainData.height}</Td>
                  <Td>{a.domainData.weight}</Td>
                  <Td>{a.domainData.bmi}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
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
