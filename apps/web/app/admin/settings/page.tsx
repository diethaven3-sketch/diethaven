"use client";

import { useEffect, useState, type FormEvent } from "react";
import { updateProfileSchema, changePasswordSchema } from "@repo/types";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { Field } from "../../../components/ui/input";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
}

function ProfileForm() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Profile>("/auth/profile", { token })
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setPhone(p.phone ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile."));
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = updateProfileSchema.safeParse({ name, phone: phone || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiFetch<Profile>("/auth/profile", { method: "PATCH", token, body: parsed.data });
      setProfile(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Profile</h3>
      <p className="mt-1 text-sm text-body">Your account details.</p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {success ? <Banner tone="success">Profile updated.</Banner> : null}

        <Field label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Phone (optional)" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="Email" name="email" value={profile?.email ?? ""} disabled />

        <Button type="submit" loading={submitting} className="self-start">
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", token, body: parsed.data });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Change password</h3>
      <p className="mt-1 text-sm text-body">Use a strong password you don&apos;t use elsewhere.</p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {success ? <Banner tone="success">Password updated.</Banner> : null}

        <Field
          label="Current password"
          type="password"
          name="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Field
          label="New password"
          type="password"
          name="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" loading={submitting} className="self-start">
          Update password
        </Button>
      </form>
    </Card>
  );
}

function SettingsPage() {
  return (
    <AdminShell title="Settings">
      <h2 className="text-xl font-bold text-heading">Settings</h2>
      <p className="mt-1 text-sm text-body">Manage your account.</p>

      <div className="mt-6 flex flex-col gap-6">
        <ProfileForm />
        <PasswordForm />
      </div>
    </AdminShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <SettingsPage />
    </RequireRole>
  );
}
