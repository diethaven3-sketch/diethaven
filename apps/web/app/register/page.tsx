"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dietitianRegisterSchema } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Banner } from "../../components/ui/banner";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  licenseNumber: "",
  specialty: "",
  facility: "",
};

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const payload = { ...form, phone: form.phone || undefined };
    const result = dietitianRegisterSchema.safeParse(payload);
    if (result.success) {
      setFieldErrors({});
      return true;
    }
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      errors[String(issue.path[0])] = issue.message;
    }
    setFieldErrors(errors);
    return false;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/dietitian/register", {
        method: "POST",
        body: { ...form, phone: form.phone || undefined },
      });
      login(accessToken);
      router.replace("/dashboard");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-lg">
        <h1 className="text-2xl font-bold">Dietitian registration</h1>
        <p className="mt-1 text-sm text-body">
          Your account will be reviewed by an administrator before you can access patient data.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {formError ? <Banner tone="danger">{formError}</Banner> : null}

          <Field label="Full name" name="name" value={form.name} onChange={update("name")} onBlur={validate} error={fieldErrors.name} required />
          <Field label="Email" type="email" name="email" value={form.email} onChange={update("email")} onBlur={validate} error={fieldErrors.email} required />
          <Field label="Password" type="password" name="password" value={form.password} onChange={update("password")} onBlur={validate} error={fieldErrors.password} required />
          <Field label="Phone (optional)" name="phone" value={form.phone} onChange={update("phone")} onBlur={validate} error={fieldErrors.phone} />
          <Field label="License number" name="licenseNumber" value={form.licenseNumber} onChange={update("licenseNumber")} onBlur={validate} error={fieldErrors.licenseNumber} required />
          <Field label="Specialty" name="specialty" value={form.specialty} onChange={update("specialty")} onBlur={validate} error={fieldErrors.specialty} required />
          <Field label="Facility" name="facility" value={form.facility} onChange={update("facility")} onBlur={validate} error={fieldErrors.facility} required />

          <Button type="submit" loading={submitting} className="mt-2 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-body">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
