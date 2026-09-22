"use client";

import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { ProfileForm, PasswordForm } from "../../../components/account-forms";

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
