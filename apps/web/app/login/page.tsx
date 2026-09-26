"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, validateWithSchema } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Banner } from "../../components/ui/banner";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
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

  const validate = () => {
    const result = validateWithSchema(loginSchema, { email, password });
    if (result.success) {
      setFieldErrors({});
      return true;
    }
    setFieldErrors(result.errors);
    return false;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      login(accessToken);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...error.fieldErrors }));
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-body">Dietitian and administrator access.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {formError ? <Banner tone="danger">{formError}</Banner> : null}

          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            onBlur={validate}
            error={fieldErrors.email}
            required
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
            onBlur={validate}
            error={fieldErrors.password}
            required
          />

          <Button type="submit" loading={submitting} className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-body">
          New dietitian?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </p>
      </Card>
    </div>
  );
}
