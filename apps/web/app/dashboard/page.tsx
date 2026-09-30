"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  NotebookPen,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  BMI_CATEGORY_LABELS,
  LOGGING_GAP_DAYS,
  LOW_ADHERENCE_PERCENT,
  OUTCOME_STATUS_LABELS,
  type AttentionReason,
  type DietitianOverview,
  type OutcomeStatus,
  type PatientOverview,
} from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { RequireRole } from "../../components/require-role";
import { AppShell } from "../../components/app-shell";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Banner } from "../../components/ui/banner";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Modal } from "../../components/ui/modal";
import { SearchInput } from "../../components/ui/search-input";
import { Skeleton, StatCardSkeleton, TableSkeleton } from "../../components/ui/skeleton";
import { Table, Thead, Tbody, Th, Td } from "../../components/ui/table";
import { InvitePatientForm } from "../../components/invites/invite-form";
import { Pagination } from "../../components/ui/pagination";
import { usePagination } from "../../lib/use-pagination";
import { ActivityChart, HorizontalBars, Meter, Sparkline } from "../../components/dashboard/charts";

interface DietitianProfile {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  licenseNumber: string;
  specialty: string;
  facility: string;
}

const ATTENTION_LABELS: Record<AttentionReason, string> = {
  NO_ASSESSMENT: "No assessment yet",
  NEVER_LOGGED: "Hasn't logged food",
  LOGGING_GAP: `No diary entry in ${LOGGING_GAP_DAYS}+ days`,
  LOW_ADHERENCE: `Adherence under ${LOW_ADHERENCE_PERCENT}%`,
  LABS_OUT_OF_RANGE: "Labs outside range",
  WORSENED: "Last visit: worsened",
};

/** Clinical signals rank above engagement gaps in the attention list. */
const ATTENTION_WEIGHT: Record<AttentionReason, number> = {
  WORSENED: 5,
  LABS_OUT_OF_RANGE: 4,
  LOW_ADHERENCE: 3,
  LOGGING_GAP: 2,
  NO_ASSESSMENT: 1,
  NEVER_LOGGED: 1,
};

const attentionTone = (reason: AttentionReason) =>
  reason === "WORSENED" || reason === "LABS_OUT_OF_RANGE" ? "danger" : "warning";

const OUTCOME_BAR: Record<OutcomeStatus, string> = {
  RESOLVED: "bg-primary",
  IMPROVED: "bg-primary/70",
  UNCHANGED: "bg-gray-400",
  WORSENED: "bg-red-600",
};

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function age(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) years -= 1;
  return years;
}

function relativeDay(iso: string | null) {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function attentionScore(p: PatientOverview) {
  return p.attention.reduce((sum, reason) => sum + ATTENTION_WEIGHT[reason], 0);
}

// ---------------------------------------------------------------------------

const accentClasses = {
  primary: "bg-surface-alt text-primary",
  warning: "bg-orange-50 text-secondary-dark",
  danger: "bg-red-50 text-red-700",
};

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  accent?: keyof typeof accentClasses;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-body/75">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClasses[accent]}`}>
          <Icon size={18} aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-body/70">{detail}</p>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <h3 className="text-base font-bold text-heading">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-body/70">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function AttentionList({ patients }: { patients: PatientOverview[] }) {
  const flagged = useMemo(
    () =>
      patients
        .filter((p) => p.attention.length > 0)
        .sort((a, b) => attentionScore(b) - attentionScore(a))
        .slice(0, 6),
    [patients],
  );

  if (flagged.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Everyone is on track"
        description="No patient trips any of the follow-up checks right now."
        className="py-6"
      />
    );
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {flagged.map((p) => (
        <li key={p.userId}>
          <Link
            href={`/dashboard/patients/${p.userId}`}
            className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface"
          >
            <Avatar name={p.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading group-hover:underline">{p.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...p.attention]
                  .sort((a, b) => ATTENTION_WEIGHT[b] - ATTENTION_WEIGHT[a])
                  .map((reason) => (
                    <Badge key={reason} tone={attentionTone(reason)} className="px-2 py-0.5 text-[11px]">
                      {ATTENTION_LABELS[reason]}
                    </Badge>
                  ))}
              </div>
            </div>
            <ArrowRight size={14} className="mt-1 text-body/40 group-hover:text-primary" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function adherenceTone(percent: number) {
  if (percent >= 75) return "good" as const;
  if (percent >= LOW_ADHERENCE_PERCENT) return "warning" as const;
  return "danger" as const;
}

function CaseloadTable({ patients }: { patients: PatientOverview[] }) {
  const [query, setQuery] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter(
      (p) =>
        (!onlyFlagged || p.attention.length > 0) &&
        (!q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)),
    );
  }, [patients, query, onlyFlagged]);
  const pager = usePagination(visible, 10, `${query}|${onlyFlagged}`);

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-heading">My patients</h3>
          <p className="mt-0.5 text-xs text-body/70">Weight, diary and care status at a glance. Select a patient to open their record.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Needs attention only
          </label>
          <SearchInput value={query} onChange={setQuery} placeholder="Search patients…" className="sm:w-60" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-sm text-body">No patients match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <tr>
                <Th>Patient</Th>
                <Th>Weight trend</Th>
                <Th>BMI</Th>
                <Th>Diary (7 days)</Th>
                <Th>Adherence</Th>
                <Th>Care</Th>
                <Th>Last visit</Th>
              </tr>
            </Thead>
            <Tbody>
              {pager.pageItems.map((p) => (
                <tr key={p.userId} className="align-middle">
                  <Td>
                    <Link href={`/dashboard/patients/${p.userId}`} className="group flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-primary group-hover:underline">
                          {p.name}
                          {p.attention.length > 0 ? (
                            <AlertTriangle
                              size={14}
                              className="text-secondary-dark"
                              aria-label={`Needs attention: ${p.attention.map((r) => ATTENTION_LABELS[r]).join(", ")}`}
                            />
                          ) : null}
                        </p>
                        <p className="text-xs text-body/70">
                          {age(p.dateOfBirth)} y · {p.sex.charAt(0) + p.sex.slice(1).toLowerCase()}
                        </p>
                      </div>
                    </Link>
                  </Td>
                  <Td>
                    {p.latestWeight === null ? (
                      <span className="text-xs text-body/60">No readings</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Sparkline
                          values={p.weightSeries.map((pt) => pt.weight)}
                          label={`Weight trend for ${p.name}: ${p.weightSeries.map((pt) => `${pt.weight} kg`).join(", ")}`}
                        />
                        <div>
                          <p className="text-sm font-semibold tabular-nums text-heading">{p.latestWeight} kg</p>
                          {/* Neutral ink: whether a loss is good depends on the patient's goal. */}
                          <p className="text-xs tabular-nums text-body/70">
                            {p.weightChange === null
                              ? "1 reading"
                              : `${p.weightChange > 0 ? "+" : ""}${p.weightChange} kg overall`}
                          </p>
                        </div>
                      </div>
                    )}
                  </Td>
                  <Td>
                    {p.latestBmi === null || !p.bmiCategory ? (
                      <span className="text-xs text-body/60">—</span>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-heading">{p.latestBmi}</p>
                        <p className="text-xs text-body/70">{BMI_CATEGORY_LABELS[p.bmiCategory]}</p>
                      </div>
                    )}
                  </Td>
                  <Td>
                    <p className="text-sm tabular-nums text-heading">{p.daysLogged7}/7 days</p>
                    <p className="text-xs text-body/70">Last: {relativeDay(p.lastLogAt)}</p>
                  </Td>
                  <Td className="min-w-28">
                    {p.adherence7 !== null ? (
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-heading">{p.adherence7}%</p>
                        <Meter percent={p.adherence7} tone={adherenceTone(p.adherence7)} />
                      </div>
                    ) : (
                      <span className="text-xs text-body/60">{p.hasMealPlan ? "Not scored" : "No meal plan"}</span>
                    )}
                  </Td>
                  <Td>
                    <p className="text-sm text-heading">
                      {p.activeDiagnoses} {p.activeDiagnoses === 1 ? "diagnosis" : "diagnoses"}
                    </p>
                    <p className="text-xs text-body/70">
                      {p.activeInterventions} active {p.activeInterventions === 1 ? "plan" : "plans"}
                    </p>
                  </Td>
                  <Td>
                    {p.lastFollowUp ? (
                      <div>
                        <Badge
                          tone={
                            p.lastFollowUp.outcome === "WORSENED"
                              ? "danger"
                              : p.lastFollowUp.outcome === "UNCHANGED"
                                ? "neutral"
                                : "success"
                          }
                        >
                          {OUTCOME_STATUS_LABELS[p.lastFollowUp.outcome]}
                        </Badge>
                        <p className="mt-1 text-xs text-body/70">{relativeDay(p.lastFollowUp.date)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-body/60">No visits</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          <Pagination {...pager} onPageChange={pager.setPage} noun="patients" className="border-t border-gray-200 px-5 py-3" />
        </div>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-44 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-6 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </Card>
      </div>
      <Card className="mt-6 p-0">
        <TableSkeleton columns={6} rows={4} />
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

function DietitianDashboard() {
  const { token, profile: account } = useAuth();
  const [profile, setProfile] = useState<DietitianProfile | null>(null);
  const [overview, setOverview] = useState<DietitianOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profileRes, overviewRes] = await Promise.all([
        apiFetch<DietitianProfile>("/dietitian/me", { token }),
        apiFetch<DietitianOverview>("/dietitian/overview", { token }),
      ]);
      setProfile(profileRes);
      setOverview(overviewRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const firstName = account?.name?.trim().split(/\s+/)[0];
  const approved = profile?.approvalStatus === "APPROVED";
  const totals = overview?.totals;

  return (
    <AppShell title="Dietitian dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-body/70">
            {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-heading">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-body/75">
            {totals
              ? totals.needsAttention > 0
                ? `${totals.needsAttention} of your ${totals.patients} ${totals.patients === 1 ? "patient" : "patients"} could use a check-in today.`
                : "Here's how your patients are doing."
              : "Here's how your patients are doing."}
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} disabled={profile !== null && !approved}>
          <UserPlus size={16} aria-hidden />
          Invite patient
        </Button>
      </div>

      {profile && !approved ? (
        <Banner tone={profile.approvalStatus === "PENDING" ? "warning" : "danger"} className="mt-6">
          {profile.approvalStatus === "PENDING"
            ? "Your account is pending admin approval. You can invite patients once approved."
            : `Your account is ${profile.approvalStatus.toLowerCase()}. Contact an administrator for details.`}
        </Banner>
      ) : null}

      {error ? (
        <Banner tone="danger" className="mt-6">
          {error}
        </Banner>
      ) : null}

      <div className="mt-6">
        {!overview ? (
          error ? null : <DashboardSkeleton />
        ) : overview.patients.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No linked patients yet"
              description={
                totals!.pendingInvites > 0
                  ? `${totals!.pendingInvites} invite${totals!.pendingInvites === 1 ? " is" : "s are"} waiting to be accepted. Once a patient joins, their progress shows up here.`
                  : "Invite a patient by email. Once they join, their weight trend, food diary and care status show up here."
              }
              action={
                approved ? (
                  <Button onClick={() => setInviteOpen(true)}>
                    <UserPlus size={16} aria-hidden />
                    Invite your first patient
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Linked patients"
                value={totals!.patients}
                detail={`${totals!.pendingInvites} pending ${totals!.pendingInvites === 1 ? "invite" : "invites"}`}
                icon={Users}
              />
              <StatTile
                label="Logged food today"
                value={totals!.loggedToday}
                detail={`of ${totals!.patients} ${totals!.patients === 1 ? "patient" : "patients"}`}
                icon={NotebookPen}
              />
              <StatTile
                label="Need attention"
                value={totals!.needsAttention}
                detail={totals!.needsAttention === 0 ? "Everyone is on track" : "See the list below"}
                icon={AlertTriangle}
                accent={totals!.needsAttention > 0 ? "warning" : "primary"}
              />
              <StatTile
                label="Active care plans"
                value={totals!.activeInterventions}
                detail={`${totals!.activeDiagnoses} active ${totals!.activeDiagnoses === 1 ? "diagnosis" : "diagnoses"}`}
                icon={ClipboardList}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard
                title="Food diary activity"
                subtitle="Patients who logged at least one meal, last 14 days"
                className="lg:col-span-2"
              >
                <ActivityChart days={overview.loggingActivity} />
              </SectionCard>
              <SectionCard title="Needs attention" subtitle="Ranked by clinical signals first, then engagement">
                <AttentionList patients={overview.patients} />
              </SectionCard>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <SectionCard title="BMI distribution" subtitle="Latest recorded BMI per patient (WHO adult categories)">
                <HorizontalBars
                  unit={["patient", "patients"]}
                  data={overview.bmiDistribution.map((d) => ({
                    key: d.category,
                    label: BMI_CATEGORY_LABELS[d.category],
                    value: d.patients,
                    // One series, one color: the category label carries identity.
                    barClass: "bg-primary",
                  }))}
                />
                <p className="mt-3 text-xs text-body/60">
                  {overview.patients.filter((p) => p.bmiCategory === null).length} without an anthropometric reading.
                </p>
              </SectionCard>
              <SectionCard title="Follow-up outcomes" subtitle="Outcome of each patient's most recent visit">
                <HorizontalBars
                  unit={["patient", "patients"]}
                  data={overview.outcomeDistribution.map((d) => ({
                    key: d.outcome,
                    label: OUTCOME_STATUS_LABELS[d.outcome],
                    value: d.patients,
                    barClass: OUTCOME_BAR[d.outcome],
                  }))}
                />
                <p className="mt-3 text-xs text-body/60">
                  {overview.patients.filter((p) => !p.lastFollowUp).length} without a recorded follow-up.
                </p>
              </SectionCard>
            </div>

            <div className="mt-6">
              <CaseloadTable patients={overview.patients} />
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-body/60">
              <Activity size={14} className="mt-0.5 shrink-0" aria-hidden />
              &ldquo;Needs attention&rdquo; is a fixed set of rule-based checks (missing assessment, diary gaps,
              adherence under {LOW_ADHERENCE_PERCENT}%, labs outside advisory reference ranges, a worsened last
              visit) — prompts to look, not a diagnosis or risk score. Adherence is scored against the current
              meal plan and is not a validated clinical measure.
            </p>
          </>
        )}
      </div>

      <Modal
        title="Invite a patient"
        description="They'll get an email link to create their account and join your caseload."
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      >
        <InvitePatientForm onInvited={load} />
      </Modal>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <RequireRole role="DIETITIAN">
      <DietitianDashboard />
    </RequireRole>
  );
}
