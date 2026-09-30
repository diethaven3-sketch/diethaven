"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  BarChart3,
} from "lucide-react";
import type { AdminRecentAction, AdminStats } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { RequireRole } from "../../components/require-role";
import { AdminShell } from "../../components/admin-shell";
import { Card } from "../../components/ui/card";
import { Banner } from "../../components/ui/banner";
import { Skeleton, StatCardSkeleton } from "../../components/ui/skeleton";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { ColumnChart, HorizontalBars, shortDate } from "../../components/dashboard/charts";

type Stats = AdminStats;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ACTION_VERB: Record<AdminRecentAction["action"], string> = {
  CREATE: "created",
  UPDATE: "updated",
  VIEW: "viewed",
};

/** "FoodExchangeItem" -> "food exchange item". */
function humanEntity(entityType: string) {
  return entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function ChartCard({
  title,
  subtitle,
  className,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-heading">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-body/70">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function RecentActions({ actions }: { actions: AdminRecentAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-body/70">No changes recorded yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-gray-100">
      {actions.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <Avatar name={entry.user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-body">
              <span className="font-semibold text-heading">{entry.user.name}</span> {ACTION_VERB[entry.action]}{" "}
              {/^[aeiou]/i.test(entry.entityType) ? "an" : "a"} {humanEntity(entry.entityType)}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-body/60">
              <Badge tone={entry.user.role === "ADMIN" ? "info" : "neutral"} className="px-1.5 py-0 text-[10px]">
                {entry.user.role.charAt(0) + entry.user.role.slice(1).toLowerCase()}
              </Badge>
              <time dateTime={entry.timestamp} title={new Date(entry.timestamp).toLocaleString()}>
                {timeAgo(entry.timestamp)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChartsSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-44 w-full" />
      </Card>
      <Card>
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mt-4 h-9 w-full" />
        ))}
      </Card>
    </div>
  );
}

function PlatformCharts({ stats }: { stats: Stats }) {
  const activeInvites = Math.max(0, (stats.invites.PENDING ?? 0) - stats.lapsedInvites);
  const lastWeek = stats.signups[stats.signups.length - 1];

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Platform activity"
          subtitle="Records created or updated per day, last 14 days (hover for page views)"
          className="lg:col-span-2"
        >
          <ColumnChart
            caption="Records created or updated per day"
            startLabel={stats.activity[0] ? shortDate(stats.activity[0].date) : ""}
            endLabel="Today"
            data={stats.activity.map((d) => ({
              key: d.date,
              value: d.changes,
              title: shortDate(d.date),
              detail: `${plural(d.changes, "change", "changes")} · ${plural(d.views, "view", "views")}`,
            }))}
          />
        </ChartCard>
        <ChartCard
          title="Recent actions"
          subtitle="Latest creates and updates"
          action={
            <Link
              href="/admin/audit-log"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Full log <ArrowRight size={12} />
            </Link>
          }
        >
          <RecentActions actions={stats.recentActions} />
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard
          title="New sign-ups per week"
          subtitle={`Last 12 weeks${
            lastWeek
              ? ` · this week so far: ${plural(lastWeek.patients, "patient", "patients")}, ${plural(lastWeek.dietitians, "dietitian", "dietitians")}`
              : ""
          }`}
        >
          {/* Small multiples rather than one two-series chart: patient volume
              would flatten the dietitian bars on a shared scale. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {(["patients", "dietitians"] as const).map((series) => (
              <div key={series}>
                <p className="mb-3 text-sm font-semibold text-heading">
                  {series === "patients" ? "Patients" : "Dietitians"}
                </p>
                <ColumnChart
                  heightClass="h-36"
                  caption={`New ${series} per week`}
                  startLabel={stats.signups[0] ? `w/c ${shortDate(stats.signups[0].weekStart)}` : ""}
                  endLabel="This week"
                  data={stats.signups.map((w) => ({
                    key: w.weekStart,
                    value: w[series],
                    title: `Week of ${shortDate(w.weekStart)}`,
                    detail: plural(w[series], series === "patients" ? "patient" : "dietitian", series),
                  }))}
                />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title="Dietitian accounts" subtitle="By approval status">
          <HorizontalBars
            unit={["dietitian", "dietitians"]}
            data={[
              { key: "APPROVED", label: "Approved", value: stats.dietitians.APPROVED ?? 0, barClass: "bg-primary" },
              { key: "PENDING", label: "Pending", value: stats.dietitians.PENDING ?? 0, barClass: "bg-secondary" },
              { key: "REJECTED", label: "Rejected", value: stats.dietitians.REJECTED ?? 0, barClass: "bg-red-600" },
              { key: "SUSPENDED", label: "Suspended", value: stats.dietitians.SUSPENDED ?? 0, barClass: "bg-gray-400" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Patient invites" subtitle="Every invite sent by dietitians, by outcome">
          <HorizontalBars
            unit={["invite", "invites"]}
            data={[
              { key: "ACCEPTED", label: "Accepted", value: stats.invites.ACCEPTED ?? 0, barClass: "bg-primary" },
              { key: "PENDING", label: "Awaiting", value: activeInvites, barClass: "bg-secondary" },
              {
                key: "EXPIRED",
                label: "Expired",
                value: (stats.invites.EXPIRED ?? 0) + stats.lapsedInvites,
                barClass: "bg-gray-400",
              },
            ]}
          />
        </ChartCard>
      </div>
    </>
  );
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
              value={Math.max(0, (stats.invites.PENDING ?? 0) - stats.lapsedInvites)}
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

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-heading/80">Trends &amp; Activity</h3>
        </div>
        {stats ? <PlatformCharts stats={stats} /> : error ? null : <ChartsSkeleton />}
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
