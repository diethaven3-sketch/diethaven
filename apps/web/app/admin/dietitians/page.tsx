"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { Field } from "../../../components/ui/input";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";

interface DietitianRow {
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
    createdAt: string;
    _count: { patientsAsDietitian: number };
  };
}

export const statusTone: Record<DietitianRow["approvalStatus"], "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "neutral",
};

function DietitiansPage() {
  const { token } = useAuth();
  const [dietitians, setDietitians] = useState<DietitianRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DietitianRow[]>("/admin/dietitians", { token });
      setDietitians(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dietitians.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") => {
    setUpdatingId(id);
    setError(null);
    try {
      await apiFetch(`/admin/dietitians/${id}/status`, { method: "PATCH", token, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!dietitians) return null;
    const q = search.trim().toLowerCase();
    if (!q) return dietitians;
    return dietitians.filter(
      (d) => d.user.name.toLowerCase().includes(q) || d.user.email.toLowerCase().includes(q),
    );
  }, [dietitians, search]);

  return (
    <AdminShell title="Dietitian accounts">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Dietitian accounts</h2>
          <p className="mt-1 text-sm text-body">Approve, reject, or suspend dietitian registrations.</p>
        </div>
        <div className="w-full sm:w-64">
          <Field label="Search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      <Card className="mt-6 p-0">
        {filtered === null ? (
          <p className="p-6 text-sm text-body">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-body">No dietitians match.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>License</Th>
                <Th>Facility</Th>
                <Th>Patients</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <Link href={`/admin/dietitians/${d.id}`} className="font-semibold text-primary hover:underline">
                      {d.user.name}
                    </Link>
                  </Td>
                  <Td>{d.user.email}</Td>
                  <Td>{d.licenseNumber}</Td>
                  <Td>{d.facility}</Td>
                  <Td>{d.user._count.patientsAsDietitian}</Td>
                  <Td>
                    <Badge tone={statusTone[d.approvalStatus]}>{d.approvalStatus}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        className="px-3 py-1.5 text-xs"
                        disabled={d.approvalStatus === "APPROVED" || updatingId === d.id}
                        onClick={() => updateStatus(d.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-xs"
                        disabled={d.approvalStatus === "REJECTED" || updatingId === d.id}
                        onClick={() => updateStatus(d.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-xs"
                        disabled={d.approvalStatus === "SUSPENDED" || updatingId === d.id}
                        onClick={() => updateStatus(d.id, "SUSPENDED")}
                      >
                        Suspend
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </AdminShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <DietitiansPage />
    </RequireRole>
  );
}
