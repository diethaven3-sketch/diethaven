"use client";

import { Settings as SettingsIcon, Shield, User } from "lucide-react";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { ProfileForm, PasswordForm } from "../../../components/account-forms";

function SettingsPage() {
  return (
    <AdminShell title="Settings">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SettingsIcon size={22} className="text-primary" />
          <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Account Settings
          </h2>
        </div>
        <p className="mt-1 text-sm text-body/75">
          Manage your administrator profile, photo, security credentials, and authentication preferences.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <h3 className="text-base font-bold text-heading">Personal Information</h3>
          </div>
          <ProfileForm />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h3 className="text-base font-bold text-heading">Security & Password</h3>
          </div>
          <PasswordForm />
        </div>
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
