"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Users,
  Building2,
  Award,
  Phone,
  Calendar,
  Mail,
} from "lucide-react";
import { apiFetch, ApiError } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";
import { RequireRole } from "../../../../components/require-role";
import { AdminShell } from "../../../../components/admin-shell";
import { Avatar } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Banner } from "../../../../components/ui/banner";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { DetailCardSkeleton, TableSkeleton } from "../../../../components/ui/skeleton";
import { Table, Thead, Tbody, Th, Td } from "../../../../components/ui/table";
import { statusTone } from "../page";

interface DietitianDetail {
  id: string;
  licenseNumber: string;
  specialty: string;
  facility: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl?: string | null;
    createdAt: string;
  };
  patients: { id: string; name: string; email: string; linkedAt: string }[];
}

function DietitianDetailView({ id }: { id: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [dietitian, setDietitian] = useState<DietitianDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DietitianDetail>(`/admin/dietitians/${id}`, { token });
      setDietitian(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dietitian.");
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (status: "APPROVED" | "REJECTED" | "SUSPENDED") => {
    setUpdating(true);
    setError(null);
    try {
      await apiFetch(`/admin/dietitians/${id}/status`, { method: "PATCH", token, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminShell title="Dietitian detail">
      <button
        onClick={() => router.push("/admin/dietitians")}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to dietitians
      </button>

      {error ? <Banner tone="danger" className="mb-4">{error}</Banner> : null}

      {!dietitian ? (
        <div className="space-y-6">
          <DetailCardSkeleton />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            <TableSkeleton columns={3} rows={3} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                src={dietitian.user.avatarUrl}
                name={dietitian.user.name}
                size="xl"
                className="ring-2 ring-primary/20"
              />
              <div>
                <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
                  {dietitian.user.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-body/75">
                  <Mail size={14} />
                  <span>{dietitian.user.email}</span>
                </div>
              </div>
            </div>
            <div>
              <Badge tone={statusTone[dietitian.approvalStatus]}>{dietitian.approvalStatus}</Badge>
            </div>
          </div>

          <Card className="mt-6">
            <h3 className="text-base font-bold text-heading mb-4">Credentials & Facility</h3>
            <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Phone size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">Phone</dt>
                  <dd className="mt-0.5 font-semibold text-heading">{dietitian.user.phone ?? "Not provided"}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Calendar size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">Registered on</dt>
                  <dd className="mt-0.5 font-semibold text-heading">
                    {new Date(dietitian.user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Award size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">License Number</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-heading">{dietitian.licenseNumber}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Award size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">Specialty</dt>
                  <dd className="mt-0.5 font-semibold text-heading">{dietitian.specialty}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Building2 size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">Facility / Hospital</dt>
                  <dd className="mt-0.5 font-semibold text-heading">{dietitian.facility}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-surface/40 p-3">
                <Users size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-body/60">Active Patients</dt>
                  <dd className="mt-0.5 font-semibold text-heading">{dietitian.patients.length}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-gray-100 pt-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-body/60 mr-2">
                Approval status:
              </span>
              <Button
                variant="primary"
                disabled={dietitian.approvalStatus === "APPROVED" || updating}
                onClick={() => updateStatus("APPROVED")}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                Approve dietitian
              </Button>
              <Button
                variant="outline"
                disabled={dietitian.approvalStatus === "REJECTED" || updating}
                onClick={() => updateStatus("REJECTED")}
                className="flex items-center gap-1.5"
              >
                <XCircle size={15} />
                Reject
              </Button>
              <Button
                variant="danger"
                disabled={dietitian.approvalStatus === "SUSPENDED" || updating}
                onClick={() => updateStatus("SUSPENDED")}
                className="flex items-center gap-1.5"
              >
                <Ban size={15} />
                Suspend account
              </Button>
            </div>
          </Card>

          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-lg font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
              Linked Patients ({dietitian.patients.length})
            </h3>
          </div>

          <Card className="mt-3 p-0 overflow-hidden shadow-xs border-gray-200">
            {dietitian.patients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No patients linked yet"
                description="This dietitian does not currently have any active assigned patients."
              />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Patient Name</Th>
                    <Th>Email</Th>
                    <Th>Linked Date</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {dietitian.patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <Td className="font-semibold text-heading">{p.name}</Td>
                      <Td className="text-body/80">{p.email}</Td>
                      <Td className="text-sm">{new Date(p.linkedAt).toLocaleDateString()}</Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <RequireRole role="ADMIN">
      <DietitianDetailView id={params.id} />
    </RequireRole>
  );
}
