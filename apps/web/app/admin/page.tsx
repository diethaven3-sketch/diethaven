"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { RequireRole } from "../../components/require-role";
import { AdminShell } from "../../components/admin-shell";
import { Card } from "../../components/ui/card";
import { Banner } from "../../components/ui/banner";

interface Stats {
  dietitians: Record<string, number>;
  invites: Record<string, number>;
  patientCount: number;
  assessmentCount: number;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-body/70">{label}</p>
      <p className="mt-2 text-3xl font-bold text-heading">{value}</p>
    </Card>
  );
}

function Overview() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/admin/stats", { token })
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load stats."));
  }, [token]);

  return (
    <AdminShell title="Platform overview">
      <h2 className="text-xl font-bold text-heading">Overview</h2>
      <p className="mt-1 text-sm text-body">Snapshot of dietitian onboarding and platform activity.</p>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      {stats ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Pending dietitians" value={stats.dietitians.PENDING ?? 0} />
            <StatCard label="Approved dietitians" value={stats.dietitians.APPROVED ?? 0} />
            <StatCard label="Rejected dietitians" value={stats.dietitians.REJECTED ?? 0} />
            <StatCard label="Suspended dietitians" value={stats.dietitians.SUSPENDED ?? 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Linked patients" value={stats.patientCount} />
            <StatCard label="Anthropometric entries" value={stats.assessmentCount} />
            <StatCard label="Pending invites" value={stats.invites.PENDING ?? 0} />
            <StatCard label="Accepted invites" value={stats.invites.ACCEPTED ?? 0} />
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-body">Loading…</p>
      )}
    </AdminShell>
  );
}

export default function AdminOverviewPage() {
  return (
    <RequireRole role="ADMIN">
      <Overview />
    </RequireRole>
  );
}
