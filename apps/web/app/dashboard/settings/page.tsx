"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AppShell } from "../../../components/app-shell";
import { ProfileForm, PasswordForm } from "../../../components/account-forms";
import { Card } from "../../../components/ui/card";
import { Banner } from "../../../components/ui/banner";
import { Badge } from "../../../components/ui/badge";

interface DietitianProfile {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  licenseNumber: string;
  specialty: string;
  facility: string;
}

const approvalTone = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  SUSPENDED: "danger",
} as const;

/**
 * Credentials are read-only here: they were verified by an admin at approval, so
 * letting a dietitian silently edit their own licence number would undermine it.
 */
function CredentialsCard() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<DietitianProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await apiFetch<DietitianProfile>("/dietitian/me", { token }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load credentials.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Professional credentials</h3>
      <p className="mt-1 text-sm text-body">
        Verified by a DietHaven administrator. Contact support if any of these need to change.
      </p>

      {error ? <Banner tone="danger" className="mt-4">{error}</Banner> : null}

      {profile ? (
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Account status</dt>
            <dd>
              <Badge tone={approvalTone[profile.approvalStatus]}>{profile.approvalStatus}</Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Licence number</dt>
            <dd className="text-heading">{profile.licenseNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Specialty</dt>
            <dd className="text-heading">{profile.specialty}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Facility</dt>
            <dd className="text-heading">{profile.facility}</dd>
          </div>
        </dl>
      ) : null}
    </Card>
  );
}

function SettingsPage() {
  return (
    <AppShell title="Settings">
      <h2 className="text-xl font-bold text-heading">Settings</h2>
      <p className="mt-1 text-sm text-body">Manage your account.</p>

      <div className="mt-6 flex flex-col gap-6">
        <ProfileForm />
        <CredentialsCard />
        <PasswordForm />
      </div>
    </AppShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="DIETITIAN">
      <SettingsPage />
    </RequireRole>
  );
}
