"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  INTERVENTION_STATUS_LABELS,
  OUTCOME_STATUS_LABELS,
  adherenceByDay,
  anthropometricTrend,
  averageAdherence,
  followUpCreateSchema,
  labTrends,
  plannedExchanges,
  weightSummary,
  validateWithSchema,
  type LabTrend,
  type Meal,
  type OutcomeStatus,
} from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../ui/button";
import { Banner } from "../ui/banner";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { SelectField } from "../ui/select";
import { TextareaField } from "../ui/textarea";
import { Table, Thead, Tbody, Th, Td } from "../ui/table";
import type { AssessmentRow } from "../assessment/domain-history";
import type { DiagnosisRow } from "../diagnosis/diagnosis-panel";
import type { InterventionRow } from "../intervention/intervention-panel";
import { FoodLogActivity, type FoodLogRow } from "./food-log-activity";

export interface FollowUpRow {
  id: string;
  date: string;
  outcome: OutcomeStatus;
  notes: string;
  diagnosis: { id: string; problemCode: string | null; problem: string; etiology: string } | null;
  intervention: { id: string; carePlanDetails: string; status: string } | null;
}

const outcomeTone = {
  RESOLVED: "success",
  IMPROVED: "success",
  UNCHANGED: "neutral",
  WORSENED: "danger",
} as const;

const flagTone = { LOW: "warning", NORMAL: "success", HIGH: "danger" } as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function signed(value: number, unit: string) {
  return `${value > 0 ? "+" : ""}${value} ${unit}`;
}

function LabTrendRow({ trend }: { trend: LabTrend }) {
  if (!trend.latest) return null;
  const change =
    trend.points.length > 1
      ? Math.round((trend.points[trend.points.length - 1]!.value - trend.points[0]!.value) * 10) / 10
      : null;

  return (
    <tr>
      <Td>{trend.label}</Td>
      <Td>
        {trend.latest.value} {trend.unit}
      </Td>
      <Td>
        {trend.low}–{trend.high} {trend.unit}
      </Td>
      <Td>{change === null ? "—" : signed(change, trend.unit)}</Td>
      <Td>
        <Badge tone={flagTone[trend.latest.flag]}>{trend.latest.flag}</Badge>
      </Td>
      <Td>
        {/* The series behind the headline, so a single reading isn't read as a trend. */}
        <span className="text-xs text-body">
          {trend.points.map((point) => `${point.value} (${formatDate(point.date)})`).join(" → ")}
        </span>
      </Td>
    </tr>
  );
}

function ProgressReport({
  patientName,
  assessments,
  diagnoses,
  interventions,
  followUps,
  foodLogs,
  activeMeals,
}: {
  patientName: string;
  assessments: AssessmentRow[];
  diagnoses: DiagnosisRow[];
  interventions: InterventionRow[];
  followUps: FollowUpRow[];
  foodLogs: FoodLogRow[];
  activeMeals: Meal[] | null;
}) {
  const anthro = useMemo(() => anthropometricTrend(assessments), [assessments]);
  const summary = useMemo(() => weightSummary(anthro), [anthro]);
  const trends = useMemo(() => labTrends(assessments), [assessments]);
  const adherenceDays = useMemo(
    () => adherenceByDay(foodLogs, plannedExchanges(activeMeals ?? [])),
    [foodLogs, activeMeals],
  );
  const averageAdherencePercent = useMemo(() => averageAdherence(adherenceDays), [adherenceDays]);
  const latest = anthro[anthro.length - 1];
  const abnormal = trends.filter((trend) => trend.latest && trend.latest.flag !== "NORMAL");

  const hasAnything = anthro.length > 0 || trends.length > 0 || followUps.length > 0 || foodLogs.length > 0;
  if (!hasAnything) {
    return (
      <Card>
        <p className="text-sm text-body">
          Nothing to report yet. Record anthropometric or laboratory assessments and the trends appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="print-target print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-heading">Progress report</h3>
          <p className="text-sm text-body">
            {patientName} · generated {new Date().toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <section className="mt-5">
        <h4 className="text-sm font-bold uppercase tracking-wide text-heading">Anthropometric</h4>
        {latest ? (
          <>
            <p className="mt-1 text-sm text-body">
              Latest: {latest.weight} kg · BMI {latest.bmi} ({formatDate(latest.date)})
            </p>
            {summary ? (
              <p className="mt-1 text-sm text-body">
                Change since {formatDate(summary.first.date)}: {signed(summary.weightChange, "kg")} ·{" "}
                {signed(summary.bmiChange, "BMI")} across {anthro.length} measurements
              </p>
            ) : (
              <p className="mt-1 text-sm text-body">
                Only one measurement recorded, so there is no trend to report yet.
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-body">No anthropometric measurements recorded.</p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="text-sm font-bold uppercase tracking-wide text-heading">Biochemical</h4>
        {trends.length === 0 ? (
          <p className="mt-1 text-sm text-body">No laboratory results recorded.</p>
        ) : (
          <p className="mt-1 text-sm text-body">
            {trends.length} {trends.length === 1 ? "marker" : "markers"} tracked,{" "}
            {abnormal.length === 0
              ? "all currently within their reference ranges"
              : `${abnormal.length} currently outside range: ${abnormal.map((t) => t.label).join(", ")}`}
            .
          </p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="text-sm font-bold uppercase tracking-wide text-heading">Dietary adherence</h4>
        {foodLogs.length === 0 ? (
          <p className="mt-1 text-sm text-body">No food diary entries logged.</p>
        ) : !activeMeals ? (
          <p className="mt-1 text-sm text-body">
            {foodLogs.length} diary {foodLogs.length === 1 ? "entry" : "entries"} logged across{" "}
            {adherenceDays.length} {adherenceDays.length === 1 ? "day" : "days"}. No meal plan is attached to an
            active intervention, so adherence cannot be measured.
          </p>
        ) : (
          <p className="mt-1 text-sm text-body">
            {averageAdherencePercent === null
              ? `${foodLogs.length} diary entries logged, but none carry exchange quantities, so adherence cannot be scored.`
              : `${averageAdherencePercent}% average adherence across ${adherenceDays.length} logged ${
                  adherenceDays.length === 1 ? "day" : "days"
                }, measured against the current meal plan.`}
          </p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="text-sm font-bold uppercase tracking-wide text-heading">Care history</h4>
        <p className="mt-1 text-sm text-body">
          {diagnoses.length} {diagnoses.length === 1 ? "diagnosis" : "diagnoses"} ·{" "}
          {interventions.filter((i) => i.status === "ACTIVE").length} active{" "}
          {interventions.length === 1 ? "intervention" : "interventions"} · {followUps.length} follow-up{" "}
          {followUps.length === 1 ? "visit" : "visits"}
        </p>
        {followUps[0] ? (
          <p className="mt-1 text-sm text-body">
            Most recent outcome: {OUTCOME_STATUS_LABELS[followUps[0].outcome]} ({formatDate(followUps[0].date)})
          </p>
        ) : null}
      </section>

      <p className="mt-5 border-t border-gray-200 pt-3 text-xs text-body">
        Summarised from data recorded in DietHaven Consult. Adherence counts logged exchange quantities against the
        meal plan currently attached to this patient&apos;s intervention, including for past days; it is not a
        validated clinical measure and says nothing about meal timing or food quality.
      </p>
    </Card>
  );
}

function FollowUpForm({
  patientId,
  diagnoses,
  interventions,
  onSaved,
}: {
  patientId: string;
  diagnoses: DiagnosisRow[];
  interventions: InterventionRow[];
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [diagnosisId, setDiagnosisId] = useState("");
  const [interventionId, setInterventionId] = useState("");
  const [outcome, setOutcome] = useState<OutcomeStatus>("IMPROVED");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      patientId,
      ...(diagnosisId ? { diagnosisId } : {}),
      ...(interventionId ? { interventionId } : {}),
      outcome,
      notes: notes.trim(),
    };

    const validation = validateWithSchema(followUpCreateSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/follow-ups", { method: "POST", token, body: validation.data });
      setDiagnosisId("");
      setInterventionId("");
      setNotes("");
      setFieldErrors({});
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Failed to save the follow-up.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (diagnoses.length === 0 && interventions.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-heading">Follow-up visit</h3>
        <p className="mt-1 text-sm text-body">
          A follow-up reviews a diagnosis or an intervention, so record one of those before documenting a visit.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Document a follow-up visit</h3>
      <p className="mt-1 text-sm text-body">
        Record how the patient responded to what was diagnosed or prescribed.
      </p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Diagnosis reviewed"
            name="diagnosisId"
            value={diagnosisId}
            onChange={(e) => {
              setDiagnosisId(e.target.value);
              clearFieldError("diagnosisId");
            }}
            error={fieldErrors.diagnosisId}
          >
            <option value="">None</option>
            {diagnoses.map((diagnosis) => (
              <option key={diagnosis.id} value={diagnosis.id}>
                {diagnosis.problemCode ? `${diagnosis.problemCode} · ` : ""}
                {diagnosis.problem}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Intervention reviewed"
            name="interventionId"
            value={interventionId}
            onChange={(e) => {
              setInterventionId(e.target.value);
              clearFieldError("diagnosisId");
            }}
            error={fieldErrors.interventionId}
          >
            <option value="">None</option>
            {interventions.map((intervention) => (
              <option key={intervention.id} value={intervention.id}>
                {intervention.diagnosis.problem} — {INTERVENTION_STATUS_LABELS[intervention.status]}
              </option>
            ))}
          </SelectField>
        </div>

        <SelectField
          label="Outcome"
          name="outcome"
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value as OutcomeStatus);
            clearFieldError("outcome");
          }}
          error={fieldErrors.outcome}
          className="sm:max-w-xs"
        >
          {(Object.keys(OUTCOME_STATUS_LABELS) as OutcomeStatus[]).map((value) => (
            <option key={value} value={value}>
              {OUTCOME_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>

        <TextareaField
          label="Visit notes"
          name="notes"
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            clearFieldError("notes");
          }}
          hint="What changed, what the patient reported, and what happens next."
          error={fieldErrors.notes}
          required
        />

        <Button type="submit" loading={submitting} className="self-start">
          Save follow-up
        </Button>
      </form>
    </Card>
  );
}

export function MonitoringPanel({
  patientId,
  patientName,
  assessments,
  diagnoses,
  interventions,
  followUps,
  foodLogs,
  onChanged,
}: {
  patientId: string;
  patientName: string;
  assessments: AssessmentRow[];
  diagnoses: DiagnosisRow[];
  interventions: InterventionRow[];
  followUps: FollowUpRow[] | null;
  foodLogs: FoodLogRow[] | null;
  onChanged: () => void;
}) {
  const trends = useMemo(() => labTrends(assessments), [assessments]);
  const visits = followUps ?? [];
  // Adherence is measured against the plan on the active intervention; if
  // several are active the most recent one wins.
  const activeMeals =
    interventions.find((intervention) => intervention.status === "ACTIVE" && intervention.mealPlan)?.mealPlan?.meals ??
    null;

  return (
    <div className="flex flex-col gap-6">
      <ProgressReport
        patientName={patientName}
        assessments={assessments}
        diagnoses={diagnoses}
        interventions={interventions}
        followUps={visits}
        foodLogs={foodLogs ?? []}
        activeMeals={activeMeals}
      />

      <div className="print:hidden">
        <h3 className="text-lg font-bold text-heading">Laboratory trends</h3>
        <p className="mt-1 text-sm text-body">
          Each marker across every recorded panel, compared against its reference range.
        </p>
        <Card className="mt-3 p-0">
          {trends.length === 0 ? (
            <p className="p-6 text-sm text-body">
              No laboratory results yet. Record a biochemical assessment and trends build up here across visits.
            </p>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Marker</Th>
                  <Th>Latest</Th>
                  <Th>Reference</Th>
                  <Th>Change</Th>
                  <Th>Flag</Th>
                  <Th>Series</Th>
                </tr>
              </Thead>
              <Tbody>
                {trends.map((trend) => (
                  <LabTrendRow key={trend.marker} trend={trend} />
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="print:hidden">
        <FoodLogActivity logs={foodLogs ?? []} activeMeals={activeMeals} />
      </div>

      <div className="print:hidden">
        <FollowUpForm
          patientId={patientId}
          diagnoses={diagnoses}
          interventions={interventions}
          onSaved={onChanged}
        />
      </div>

      <div className="print:hidden">
        <h3 className="text-lg font-bold text-heading">Follow-up history</h3>
        <div className="mt-3 flex flex-col gap-4">
          {followUps === null ? (
            <p className="text-sm text-body">Loading…</p>
          ) : visits.length === 0 ? (
            <Card>
              <p className="text-sm text-body">No follow-up visits documented yet.</p>
            </Card>
          ) : (
            visits.map((visit) => (
              <Card key={visit.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={outcomeTone[visit.outcome]}>{OUTCOME_STATUS_LABELS[visit.outcome]}</Badge>
                  <p className="text-xs text-body">{formatDate(visit.date)}</p>
                </div>
                {visit.diagnosis ? (
                  <p className="mt-2 text-sm text-heading">
                    Reviewing: {visit.diagnosis.problemCode ? `${visit.diagnosis.problemCode} · ` : ""}
                    {visit.diagnosis.problem}
                  </p>
                ) : null}
                {visit.intervention ? (
                  <p className="mt-0.5 text-sm text-body">Intervention: {visit.intervention.carePlanDetails}</p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm text-body">{visit.notes}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
