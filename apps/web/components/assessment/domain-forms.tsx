"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LAB_REFERENCES, type AssessmentDomain, type LabMarker } from "@repo/types";
import { Button } from "../ui/button";
import { Banner } from "../ui/banner";
import { Card } from "../ui/card";
import { Field } from "../ui/input";
import { SelectField } from "../ui/select";
import { TextareaField } from "../ui/textarea";
import { pruneEmpty, useDomainSave } from "./use-domain-save";

export interface DomainFormProps {
  patientId: string;
  onSaved: () => void;
}

type Saver = ReturnType<typeof useDomainSave>;

function FormShell({
  title,
  description,
  saver,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  saver: Saver;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">{title}</h3>
      <p className="mt-1 text-sm text-body">{description}</p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {saver.error ? <Banner tone="danger">{saver.error}</Banner> : null}
        {saver.success ? <Banner tone="success">Saved to the record.</Banner> : null}
        {children}
        <Button type="submit" loading={saver.submitting} className="self-start">
          Save entry
        </Button>
      </form>
    </Card>
  );
}

/** Optional single-select rendered as a native select with a blank default. */
function OptionalSelect({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <SelectField label={label} name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not recorded</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SelectField>
  );
}

const WASTING = [
  { value: "NONE", label: "None" },
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
];

// ---------------------------------------------------------------------------

function PatientHistoryForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "PATIENT_HISTORY", onSaved);
  const empty = {
    personalSocialHistory: "",
    medicalHistory: "",
    familyHistory: "",
    medicationHistory: "",
  };
  const [form, setForm] = useState(empty);
  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <FormShell
      title="Patient history"
      description="Personal, medical, family, and medication background."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        if (await saver.save(pruneEmpty(form))) setForm(empty);
      }}
    >
      <TextareaField
        label="Personal & social history"
        name="personalSocialHistory"
        value={form.personalSocialHistory}
        onChange={(e) => update("personalSocialHistory")(e.target.value)}
      />
      <TextareaField
        label="Medical & health history"
        name="medicalHistory"
        value={form.medicalHistory}
        onChange={(e) => update("medicalHistory")(e.target.value)}
      />
      <TextareaField
        label="Family history"
        name="familyHistory"
        value={form.familyHistory}
        onChange={(e) => update("familyHistory")(e.target.value)}
      />
      <TextareaField
        label="Treatment & medication history"
        name="medicationHistory"
        value={form.medicationHistory}
        onChange={(e) => update("medicationHistory")(e.target.value)}
      />
    </FormShell>
  );
}

function AnthropometricForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "ANTHROPOMETRIC", onSaved);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  return (
    <FormShell
      title="Anthropometric"
      description="BMI is calculated automatically from height and weight."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        const h = height.trim() ? Number(height) : undefined;
        const w = weight.trim() ? Number(weight) : undefined;
        if (await saver.save({ height: h, weight: w })) {
          setHeight("");
          setWeight("");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Height (cm)"
          type="number"
          inputMode="decimal"
          step="0.1"
          name="height"
          value={height}
          onChange={(e) => {
            setHeight(e.target.value);
            saver.clearFieldError("height");
          }}
          error={saver.fieldErrors.height}
          required
        />
        <Field
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          name="weight"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            saver.clearFieldError("weight");
          }}
          error={saver.fieldErrors.weight}
          required
        />
      </div>
    </FormShell>
  );
}

const LAB_MARKERS = Object.keys(LAB_REFERENCES) as LabMarker[];

function BiochemicalForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "BIOCHEMICAL", onSaved);
  const [testDate, setTestDate] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <FormShell
      title="Biochemical / laboratory"
      description="Enter only the markers that were tested. Results are flagged against standard adult reference ranges."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        const rows = LAB_MARKERS.filter((marker) => values[marker]?.trim()).map((marker) => ({
          marker,
          value: Number(values[marker]),
        }));
        if (await saver.save({ testDate, values: rows, ...(notes.trim() ? { notes: notes.trim() } : {}) })) {
          setTestDate("");
          setNotes("");
          setValues({});
        }
      }}
    >
      <Field
        label="Test date"
        type="date"
        name="testDate"
        value={testDate}
        onChange={(e) => {
          setTestDate(e.target.value);
          saver.clearFieldError("testDate");
        }}
        error={saver.fieldErrors.testDate}
        required
        className="sm:max-w-xs"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LAB_MARKERS.map((marker) => {
          const reference = LAB_REFERENCES[marker];
          return (
            <Field
              key={marker}
              label={`${reference.label} (${reference.unit})`}
              type="number"
              inputMode="decimal"
              step="any"
              name={marker}
              placeholder={`${reference.low}-${reference.high}`}
              value={values[marker] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [marker]: e.target.value }))}
            />
          );
        })}
      </div>

      <TextareaField
        label="Notes"
        name="labNotes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        hint="Laboratory, assay, or any range the lab reported differently."
      />
    </FormShell>
  );
}

function ClinicalPhysicalForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "CLINICAL_PHYSICAL", onSaved);
  const emptyForm = {
    physicalAppearance: "",
    muscleWasting: "",
    fatWasting: "",
    swallowingFunction: "",
    oralHealth: "",
  };
  const emptyVitals = { systolic: "", diastolic: "", pulse: "", temperature: "", respiratoryRate: "" };
  const [form, setForm] = useState(emptyForm);
  const [vitals, setVitals] = useState(emptyVitals);
  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const updateVital = (key: keyof typeof vitals) => (value: string) => setVitals((v) => ({ ...v, [key]: value }));

  return (
    <FormShell
      title="Nutrition-focused physical"
      description="Physical findings observed during the encounter."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        // Numbers only for the vitals that were actually filled in, so a blank
        // box doesn't become 0 and read as a recorded measurement.
        const vitalSigns = pruneEmpty(
          Object.fromEntries(
            Object.entries(vitals).map(([key, value]) => [key, value.trim() ? Number(value) : ""]),
          ),
        );
        const payload = pruneEmpty({
          ...form,
          ...(Object.keys(vitalSigns).length > 0 ? { vitalSigns } : {}),
        });
        if (await saver.save(payload)) {
          setForm(emptyForm);
          setVitals(emptyVitals);
        }
      }}
    >
      <TextareaField
        label="Physical appearance"
        name="physicalAppearance"
        value={form.physicalAppearance}
        onChange={(e) => update("physicalAppearance")(e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <OptionalSelect
          label="Muscle wasting"
          name="muscleWasting"
          value={form.muscleWasting}
          onChange={update("muscleWasting")}
          options={WASTING}
        />
        <OptionalSelect
          label="Fat wasting"
          name="fatWasting"
          value={form.fatWasting}
          onChange={update("fatWasting")}
          options={WASTING}
        />
        <OptionalSelect
          label="Swallowing function"
          name="swallowingFunction"
          value={form.swallowingFunction}
          onChange={update("swallowingFunction")}
          options={[
            { value: "NORMAL", label: "Normal" },
            { value: "MILD_DIFFICULTY", label: "Mild difficulty" },
            { value: "MODERATE_DIFFICULTY", label: "Moderate difficulty" },
            { value: "SEVERE_DIFFICULTY", label: "Severe difficulty" },
          ]}
        />
      </div>

      <TextareaField
        label="Oral health"
        name="oralHealth"
        value={form.oralHealth}
        onChange={(e) => update("oralHealth")(e.target.value)}
      />

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-heading">Vital signs</legend>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field
            label="Systolic (mmHg)"
            type="number"
            name="systolic"
            value={vitals.systolic}
            onChange={(e) => updateVital("systolic")(e.target.value)}
          />
          <Field
            label="Diastolic (mmHg)"
            type="number"
            name="diastolic"
            value={vitals.diastolic}
            onChange={(e) => updateVital("diastolic")(e.target.value)}
          />
          <Field
            label="Pulse (bpm)"
            type="number"
            name="pulse"
            value={vitals.pulse}
            onChange={(e) => updateVital("pulse")(e.target.value)}
          />
          <Field
            label="Temperature (C)"
            type="number"
            step="0.1"
            name="temperature"
            value={vitals.temperature}
            onChange={(e) => updateVital("temperature")(e.target.value)}
          />
          <Field
            label="Respiratory rate"
            type="number"
            name="respiratoryRate"
            value={vitals.respiratoryRate}
            onChange={(e) => updateVital("respiratoryRate")(e.target.value)}
          />
        </div>
      </fieldset>
    </FormShell>
  );
}

function DietaryForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "DIETARY", onSaved);
  const empty = {
    intakeMethod: "",
    usualIntake: "",
    mealPattern: "",
    preferences: "",
    aversions: "",
    allergies: "",
    culturalReligiousPractices: "",
    supplementUse: "",
  };
  const [form, setForm] = useState(empty);
  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <FormShell
      title="Dietary / food & nutrition history"
      description="Usual intake, preferences, and restrictions."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        if (await saver.save(pruneEmpty(form))) setForm(empty);
      }}
    >
      <OptionalSelect
        label="Intake method"
        name="intakeMethod"
        value={form.intakeMethod}
        onChange={update("intakeMethod")}
        options={[
          { value: "RECALL_24H", label: "24-hour recall" },
          { value: "FOOD_FREQUENCY", label: "Food frequency questionnaire" },
        ]}
      />
      <TextareaField
        label="Usual intake"
        name="usualIntake"
        rows={4}
        value={form.usualIntake}
        onChange={(e) => update("usualIntake")(e.target.value)}
      />
      <TextareaField
        label="Meal pattern"
        name="mealPattern"
        value={form.mealPattern}
        onChange={(e) => update("mealPattern")(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextareaField
          label="Food preferences"
          name="preferences"
          value={form.preferences}
          onChange={(e) => update("preferences")(e.target.value)}
        />
        <TextareaField
          label="Food aversions"
          name="aversions"
          value={form.aversions}
          onChange={(e) => update("aversions")(e.target.value)}
        />
      </div>
      <TextareaField
        label="Allergies & intolerances"
        name="allergies"
        value={form.allergies}
        onChange={(e) => update("allergies")(e.target.value)}
      />
      <TextareaField
        label="Cultural & religious food practices"
        name="culturalReligiousPractices"
        value={form.culturalReligiousPractices}
        onChange={(e) => update("culturalReligiousPractices")(e.target.value)}
      />
      <TextareaField
        label="Supplement use"
        name="supplementUse"
        value={form.supplementUse}
        onChange={(e) => update("supplementUse")(e.target.value)}
      />
    </FormShell>
  );
}

function EnvironmentalForm({ patientId, onSaved }: DomainFormProps) {
  const saver = useDomainSave(patientId, "ENVIRONMENTAL", onSaved);
  const empty = {
    livingSituation: "",
    foodSecurity: "",
    physicalActivityLevel: "",
    occupation: "",
    socioeconomicFactors: "",
  };
  const [form, setForm] = useState(empty);
  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <FormShell
      title="Environmental / lifestyle"
      description="Living situation, food access, and activity."
      saver={saver}
      onSubmit={async (e) => {
        e.preventDefault();
        if (await saver.save(pruneEmpty(form))) setForm(empty);
      }}
    >
      <TextareaField
        label="Living situation"
        name="livingSituation"
        value={form.livingSituation}
        onChange={(e) => update("livingSituation")(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalSelect
          label="Food security"
          name="foodSecurity"
          value={form.foodSecurity}
          onChange={update("foodSecurity")}
          options={[
            { value: "SECURE", label: "Secure" },
            { value: "MILD", label: "Mild insecurity" },
            { value: "MODERATE", label: "Moderate insecurity" },
            { value: "SEVERE", label: "Severe insecurity" },
          ]}
        />
        <OptionalSelect
          label="Physical activity level"
          name="physicalActivityLevel"
          value={form.physicalActivityLevel}
          onChange={update("physicalActivityLevel")}
          options={[
            { value: "SEDENTARY", label: "Sedentary" },
            { value: "LIGHT", label: "Light" },
            { value: "MODERATE", label: "Moderate" },
            { value: "VIGOROUS", label: "Vigorous" },
          ]}
        />
      </div>
      <Field
        label="Occupation"
        name="occupation"
        value={form.occupation}
        onChange={(e) => update("occupation")(e.target.value)}
      />
      <TextareaField
        label="Socioeconomic factors affecting food choices"
        name="socioeconomicFactors"
        value={form.socioeconomicFactors}
        onChange={(e) => update("socioeconomicFactors")(e.target.value)}
      />
    </FormShell>
  );
}

export const DOMAIN_FORMS: Record<AssessmentDomain, (props: DomainFormProps) => ReactNode> = {
  PATIENT_HISTORY: PatientHistoryForm,
  ANTHROPOMETRIC: AnthropometricForm,
  BIOCHEMICAL: BiochemicalForm,
  CLINICAL_PHYSICAL: ClinicalPhysicalForm,
  DIETARY: DietaryForm,
  ENVIRONMENTAL: EnvironmentalForm,
};
