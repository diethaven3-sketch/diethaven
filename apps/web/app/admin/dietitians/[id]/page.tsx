"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, ApiError } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";
import { RequireRole } from "../../../../components/require-role";
import { AdminShell } from "../../../../components/admin-shell";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Banner } from "../../../../components/ui/banner";
import { Card } from "../../../../components/ui/card";
import { Table, Thead, Tbody, Th, Td } from "../../../../components/ui/table";
import { statusTone } from "../page";

interface DietitianDetail {
  id: string;
  licenseNumber: string;
  specialty: string;
  facility: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
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
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to dietitians
      </button>

      {error ? <Banner tone="danger" className="mb-4">{error}</Banner> : null}

      {!dietitian ? (
        <p className="text-sm text-body">Loading…</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-heading">{dietitian.user.name}</h2>
              <p className="mt-1 text-sm text-body">{dietitian.user.email}</p>
            </div>
            <Badge tone={statusTone[dietitian.approvalStatus]}>{dietitian.approvalStatus}</Badge>
          </div>

          <Card className="mt-6">
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-body/70">Phone</dt>
                <dd className="mt-0.5 font-medium">{dietitian.user.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-body/70">Registered</dt>
                <dd className="mt-0.5 font-medium">{new Date(dietitian.user.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-body/70">License number</dt>
                <dd className="mt-0.5 font-medium">{dietitian.licenseNumber}</dd>
              </div>
              <div>
                <dt className="text-body/70">Specialty</dt>
                <dd className="mt-0.5 font-medium">{dietitian.specialty}</dd>
              </div>
              <div>
                <dt className="text-body/70">Facility</dt>
                <dd className="mt-0.5 font-medium">{dietitian.facility}</dd>
              </div>
              <div>
                <dt className="text-body/70">Linked patients</dt>
                <dd className="mt-0.5 font-medium">{dietitian.patients.length}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
              <Button
                variant="primary"
                disabled={dietitian.approvalStatus === "APPROVED" || updating}
                onClick={() => updateStatus("APPROVED")}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={dietitian.approvalStatus === "REJECTED" || updating}
                onClick={() => updateStatus("REJECTED")}
              >
                Reject
              </Button>
              <Button
                variant="danger"
                disabled={dietitian.approvalStatus === "SUSPENDED" || updating}
                onClick={() => updateStatus("SUSPENDED")}
              >
                Suspend
              </Button>
            </div>
          </Card>

          <h3 className="mt-8 text-lg font-bold text-heading">Linked patients</h3>
          <Card className="mt-3 p-0">
            {dietitian.patients.length === 0 ? (
              <p className="p-6 text-sm text-body">No patients linked yet.</p>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Linked</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {dietitian.patients.map((p) => (
                    <tr key={p.id}>
                      <Td>{p.name}</Td>
                      <Td>{p.email}</Td>
                      <Td>{new Date(p.linkedAt).toLocaleDateString()}</Td>
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
