"use client";

import { useState, type FormEvent } from "react";
import {
  DIAGNOSIS_DOMAIN_LABELS,
  INTERVENTION_STATUS_LABELS,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  formatPesStatement,
  interventionCreateSchema,
  validateWithSchema,
  type InterventionStatus,
  type Meal,
  type MealPlanInput,
  type Prescription,
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
import type { DiagnosisRow } from "../diagnosis/diagnosis-panel";
import { MealPlanBuilder, emptyMealPlan } from "./meal-plan-builder";

export interface MealPlanRow {
  id: string;
  name: string;
  meals: Meal[];
  calorieTarget: number | null;
  carbsTargetG: number | null;
  proteinTargetG: number | null;
  fatTargetG: number | null;
}

export interface InterventionRow {
  id: string;
  diagnosisId: string;
  carePlanDetails: string;
  prescription: Prescription | null;
  mealPlan: MealPlanRow | null;
  status: InterventionStatus;
  aiGenerated: boolean;
  createdAt: string;
  diagnosis: {
    id: string;
    domain: keyof typeof DIAGNOSIS_DOMAIN_LABELS;
    problemCode: string | null;
    problem: string;
    etiology: string;
    status: string;
  };
}

const statusTone = {
  DRAFT: "neutral",
  ACTIVE: "info",
  COMPLETED: "success",
  DISCONTINUED: "neutral",
} as const;

const emptyPrescription = {
  energyKcal: "",
  carbsG: "",
  proteinG: "",
  fatG: "",
  fluidMl: "",
  restrictions: "",
  supplements: "",
  notes: "",
};

function toPrescription(form: typeof emptyPrescription): Prescription | undefined {
  const prescription: Prescription = {};
  for (const key of ["energyKcal", "carbsG", "proteinG", "fatG", "fluidMl"] as const) {
    if (form[key].trim()) prescription[key] = Number(form[key]);
  }
  for (const key of ["restrictions", "supplements", "notes"] as const) {
    if (form[key].trim()) prescription[key] = form[key].trim();
  }
  return Object.keys(prescription).length > 0 ? prescription : undefined;
}

function InterventionForm({
  patientId,
  diagnoses,
  onSaved,
}: {
  patientId: string;
  diagnoses: DiagnosisRow[];
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [diagnosisId, setDiagnosisId] = useState("");
  const [carePlanDetails, setCarePlanDetails] = useState("");
  const [prescription, setPrescription] = useState(emptyPrescription);
  const [includeMealPlan, setIncludeMealPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanInput>(emptyMealPlan());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // An intervention answers a diagnosis, so anything ruled out is not offered.
  const selectable = diagnoses.filter((diagnosis) => diagnosis.status !== "RULED_OUT");

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

    const plan = includeMealPlan
      ? { ...mealPlan, meals: mealPlan.meals.filter((meal) => meal.items.length > 0) }
      : undefined;

    const payload = {
      patientId,
      diagnosisId,
      carePlanDetails: carePlanDetails.trim(),
      prescription: toPrescription(prescription),
      ...(plan ? { mealPlan: plan } : {}),
    };

    const validation = validateWithSchema(interventionCreateSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/interventions", { method: "POST", token, body: validation.data });
      setDiagnosisId("");
      setCarePlanDetails("");
      setPrescription(emptyPrescription);
      setIncludeMealPlan(false);
      setMealPlan(emptyMealPlan());
      setFieldErrors({});
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Failed to save intervention.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (selectable.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold text-heading">New intervention</h3>
        <p className="mt-1 text-sm text-body">
          Record a nutrition diagnosis first. Every intervention maps to a specific PES problem, so there is nothing to
          plan against yet.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">New intervention</h3>
      <p className="mt-1 text-sm text-body">
        The care plan that answers an accepted diagnosis, with an optional meal plan and prescription.
      </p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <SelectField
          label="Diagnosis this intervention addresses"
          name="diagnosisId"
          value={diagnosisId}
          onChange={(e) => {
            setDiagnosisId(e.target.value);
            clearFieldError("diagnosisId");
          }}
          error={fieldErrors.diagnosisId}
          required
        >
          <option value="">Select a diagnosis…</option>
          {selectable.map((diagnosis) => (
            <option key={diagnosis.id} value={diagnosis.id}>
              {diagnosis.problemCode ? `${diagnosis.problemCode} · ` : ""}
              {diagnosis.problem} — related to {diagnosis.etiology}
            </option>
          ))}
        </SelectField>

        <TextareaField
          label="Care plan"
          name="carePlanDetails"
          rows={5}
          value={carePlanDetails}
          onChange={(e) => {
            setCarePlanDetails(e.target.value);
            clearFieldError("carePlanDetails");
          }}
          hint="Goals, strategy, and education to be delivered."
          error={fieldErrors.carePlanDetails}
          required
        />

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-heading">Nutrition prescription</legend>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field
              label="Energy (kcal)"
              type="number"
              name="energyKcal"
              value={prescription.energyKcal}
              onChange={(e) => setPrescription((p) => ({ ...p, energyKcal: e.target.value }))}
            />
            <Field
              label="Carbohydrate (g)"
              type="number"
              name="carbsG"
              value={prescription.carbsG}
              onChange={(e) => setPrescription((p) => ({ ...p, carbsG: e.target.value }))}
            />
            <Field
              label="Protein (g)"
              type="number"
              name="proteinG"
              value={prescription.proteinG}
              onChange={(e) => setPrescription((p) => ({ ...p, proteinG: e.target.value }))}
            />
            <Field
              label="Fat (g)"
              type="number"
              name="fatG"
              value={prescription.fatG}
              onChange={(e) => setPrescription((p) => ({ ...p, fatG: e.target.value }))}
            />
            <Field
              label="Fluid (ml)"
              type="number"
              name="fluidMl"
              value={prescription.fluidMl}
              onChange={(e) => setPrescription((p) => ({ ...p, fluidMl: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <TextareaField
              label="Restrictions"
              name="restrictions"
              rows={2}
              value={prescription.restrictions}
              onChange={(e) => setPrescription((p) => ({ ...p, restrictions: e.target.value }))}
            />
            <TextareaField
              label="Supplement recommendations"
              name="supplements"
              rows={2}
              value={prescription.supplements}
              onChange={(e) => setPrescription((p) => ({ ...p, supplements: e.target.value }))}
            />
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={includeMealPlan} onChange={(e) => setIncludeMealPlan(e.target.checked)} />
          Build a meal plan from the Nigerian Food Exchange List
        </label>

        {includeMealPlan ? (
          <fieldset className="rounded-lg border border-gray-200 p-4">
            <legend className="px-1 text-sm font-medium text-heading">Meal plan</legend>
            <MealPlanBuilder value={mealPlan} onChange={setMealPlan} />
          </fieldset>
        ) : null}

        <Button type="submit" loading={submitting} className="self-start">
          Save intervention
        </Button>
      </form>
    </Card>
  );
}

function MealPlanView({ plan }: { plan: MealPlanRow }) {
  const ordered = [...plan.meals].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
  );
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">Meal plan · {plan.name}</p>
      {plan.calorieTarget || plan.carbsTargetG || plan.proteinTargetG || plan.fatTargetG ? (
        <p className="mt-1 text-sm text-body">
          Targets:{" "}
          {[
            plan.calorieTarget ? `${plan.calorieTarget} kcal` : null,
            plan.carbsTargetG ? `${plan.carbsTargetG} g carbs` : null,
            plan.proteinTargetG ? `${plan.proteinTargetG} g protein` : null,
            plan.fatTargetG ? `${plan.fatTargetG} g fat` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2">
        {ordered.map((meal, index) => (
          <div key={`${meal.mealType}-${index}`} className="rounded-lg bg-surface p-3">
            <p className="text-sm font-medium text-heading">
              {MEAL_TYPE_LABELS[meal.mealType]}
              {meal.time ? ` · ${meal.time}` : ""}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm text-body">
              {meal.items.map((item, itemIndex) => (
                <li key={`${item.foodExchangeItemId}-${itemIndex}`}>
                  {item.exchanges} × {item.foodName} ({item.portionSize})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrescriptionView({ prescription }: { prescription: Prescription }) {
  const numbers = [
    prescription.energyKcal ? `${prescription.energyKcal} kcal` : null,
    prescription.carbsG ? `${prescription.carbsG} g carbohydrate` : null,
    prescription.proteinG ? `${prescription.proteinG} g protein` : null,
    prescription.fatG ? `${prescription.fatG} g fat` : null,
    prescription.fluidMl ? `${prescription.fluidMl} ml fluid` : null,
  ].filter(Boolean);

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-surface-alt p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-dark">Nutrition prescription</p>
      {numbers.length > 0 ? <p className="mt-1 text-sm text-heading">{numbers.join(" · ")}</p> : null}
      {prescription.restrictions ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-body">
          <span className="font-medium text-heading">Restrictions: </span>
          {prescription.restrictions}
        </p>
      ) : null}
      {prescription.supplements ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-body">
          <span className="font-medium text-heading">Supplements: </span>
          {prescription.supplements}
        </p>
      ) : null}
    </div>
  );
}

function InterventionCard({
  intervention,
  patientName,
  printing,
  onPrint,
  onChanged,
}: {
  intervention: InterventionRow;
  patientName: string;
  printing: boolean;
  onPrint: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: InterventionStatus) => {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/interventions/${intervention.id}`, { method: "PATCH", token, body: { status } });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update intervention.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`print:border-0 print:shadow-none ${printing ? "print-target" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{DIAGNOSIS_DOMAIN_LABELS[intervention.diagnosis.domain]}</Badge>
          <Badge tone={statusTone[intervention.status]}>{INTERVENTION_STATUS_LABELS[intervention.status]}</Badge>
        </div>
        <p className="text-xs text-body">Created {new Date(intervention.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Only shown on paper: a printed prescription needs to say whose it is. */}
      <p className="hidden text-sm text-body print:block">
        {patientName} · printed {new Date().toLocaleDateString()}
      </p>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-body">Addresses</p>
      <p className="text-sm text-heading">
        {formatPesStatement({
          problem: intervention.diagnosis.problem,
          etiology: intervention.diagnosis.etiology,
          signsSymptoms: "the findings recorded on that diagnosis",
        })}
      </p>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-body">Care plan</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-body">{intervention.carePlanDetails}</p>

      {intervention.prescription ? <PrescriptionView prescription={intervention.prescription} /> : null}
      {intervention.mealPlan ? <MealPlanView plan={intervention.mealPlan} /> : null}

      {error ? (
        <Banner tone="danger" className="mt-3">
          {error}
        </Banner>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={onPrint}>
          Print
        </Button>
        {intervention.status !== "ACTIVE" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("ACTIVE")}>
            Mark active
          </Button>
        ) : null}
        {intervention.status !== "COMPLETED" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("COMPLETED")}>
            Mark completed
          </Button>
        ) : null}
        {intervention.status !== "DISCONTINUED" ? (
          <Button variant="outline" loading={busy} onClick={() => setStatus("DISCONTINUED")}>
            Discontinue
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function InterventionPanel({
  patientId,
  patientName,
  diagnoses,
  interventions,
  onChanged,
}: {
  patientId: string;
  patientName: string;
  diagnoses: DiagnosisRow[];
  interventions: InterventionRow[] | null;
  onChanged: () => void;
}) {
  const [printingId, setPrintingId] = useState<string | null>(null);

  // The class has to be on the card before the print dialog opens, so the paint
  // is allowed to land first and the flag is cleared once printing returns.
  const print = (id: string) => {
    setPrintingId(id);
    requestAnimationFrame(() => {
      window.print();
      setPrintingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <InterventionForm patientId={patientId} diagnoses={diagnoses} onSaved={onChanged} />
      </div>

      <div>
        <h3 className="text-lg font-bold text-heading print:hidden">Recorded interventions</h3>
        <div className="mt-3 flex flex-col gap-4">
          {interventions === null ? (
            <p className="text-sm text-body">Loading…</p>
          ) : interventions.length === 0 ? (
            <Card>
              <p className="text-sm text-body">No interventions recorded for this patient yet.</p>
            </Card>
          ) : (
            interventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                patientName={patientName}
                printing={printingId === intervention.id}
                onPrint={() => print(intervention.id)}
                onChanged={onChanged}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
