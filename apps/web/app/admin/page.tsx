"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  UserCheck,
  UserX,
  ShieldAlert,
  Users,
  Activity,
  Mail,
  MailCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { RequireRole } from "../../components/require-role";
import { AdminShell } from "../../components/admin-shell";
import { Card } from "../../components/ui/card";
import { Banner } from "../../components/ui/banner";
import { StatCardSkeleton } from "../../components/ui/skeleton";

interface Stats {
  dietitians: Record<string, number>;
  invites: Record<string, number>;
  patientCount: number;
  assessmentCount: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: typeof UserCheck;
  accent?: "primary" | "warning" | "danger" | "neutral";
  href?: string;
}

const accentBg = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-700",
};

function StatCard({ label, value, icon: Icon, accent = "primary", href }: StatCardProps) {
  const content = (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-gray-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-body/75">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentBg[accent]}`}>
          <Icon size={18} aria-hidden />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </p>
        {href && (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View <ArrowRight size={12} />
          </span>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Platform Overview
          </h2>
          <p className="mt-1 text-sm text-body/75">
            Real-time snapshot of dietitian registrations, patients, and clinical activity.
          </p>
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-6">
          {error}
        </Banner>
      ) : null}

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-heading/80">
            Dietitian Accounts
          </h3>
        </div>
        {stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pending approvals"
              value={stats.dietitians.PENDING ?? 0}
              icon={Clock}
              accent="warning"
              href="/admin/dietitians"
            />
            <StatCard
              label="Approved dietitians"
              value={stats.dietitians.APPROVED ?? 0}
              icon={UserCheck}
              accent="primary"
              href="/admin/dietitians"
            />
            <StatCard
              label="Rejected requests"
              value={stats.dietitians.REJECTED ?? 0}
              icon={UserX}
              accent="danger"
              href="/admin/dietitians"
            />
            <StatCard
              label="Suspended accounts"
              value={stats.dietitians.SUSPENDED ?? 0}
              icon={ShieldAlert}
              accent="neutral"
              href="/admin/dietitians"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-heading/80">
            Patient & Clinical Engagement
          </h3>
        </div>
        {stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Linked patients"
              value={stats.patientCount}
              icon={Users}
              accent="primary"
            />
            <StatCard
              label="Assessment records"
              value={stats.assessmentCount}
              icon={Activity}
              accent="primary"
              href="/admin/audit-log"
            />
            <StatCard
              label="Pending invites"
              value={stats.invites.PENDING ?? 0}
              icon={Mail}
              accent="warning"
            />
            <StatCard
              label="Accepted invites"
              value={stats.invites.ACCEPTED ?? 0}
              icon={MailCheck}
              accent="primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
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
