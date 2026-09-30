"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserCheck, SearchX, MoreHorizontal, CheckCircle2, XCircle, Ban, ExternalLink } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Avatar } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { SearchInput } from "../../../components/ui/search-input";
import { CustomSelect } from "../../../components/ui/custom-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { TableSkeleton } from "../../../components/ui/skeleton";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";
import { Pagination } from "../../../components/ui/pagination";
import { usePagination } from "../../../lib/use-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

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
    avatarUrl?: string | null;
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

const statusFilterOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

function DietitiansPage() {
  const { token } = useAuth();
  const [dietitians, setDietitians] = useState<DietitianRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
    let list = dietitians;
    if (statusFilter !== "ALL") {
      list = list.filter((d) => d.approvalStatus === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.user.name.toLowerCase().includes(q) ||
          d.user.email.toLowerCase().includes(q) ||
          d.facility.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.licenseNumber.toLowerCase().includes(q),
      );
    }
    return list;
  }, [dietitians, search, statusFilter]);
  const pager = usePagination(filtered ?? [], 10, `${search}|${statusFilter}`);

  return (
    <AdminShell title="Dietitian accounts">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Dietitian Accounts
          </h2>
          <p className="mt-1 text-sm text-body/75">
            Review credentials, approve registrations, and manage clinical permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, email, facility..."
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusFilterOptions}
            />
          </div>
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-body/70">
        {filtered !== null && (
          <p>
            Showing <span className="font-semibold text-heading">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "dietitian" : "dietitians"}
            {(search || statusFilter !== "ALL") && " (filtered)"}
          </p>
        )}
      </div>

      <Card className="mt-2 p-0 overflow-hidden shadow-xs border-gray-200">
        {filtered === null ? (
          <TableSkeleton columns={6} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No dietitians found"
            description={
              search || statusFilter !== "ALL"
                ? "No dietitians match your active search or filter criteria."
                : "No dietitian accounts have been registered yet."
            }
            action={
              search || statusFilter !== "ALL" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="text-xs"
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Dietitian</Th>
                <Th>License & Specialty</Th>
                <Th>Facility</Th>
                <Th>Patients</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {pager.pageItems.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar src={d.user.avatarUrl} name={d.user.name} size="sm" />
                      <div>
                        <Link
                          href={`/admin/dietitians/${d.id}`}
                          className="font-semibold text-primary hover:underline block leading-tight"
                        >
                          {d.user.name}
                        </Link>
                        <span className="text-xs text-body/70">{d.user.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div>
                      <p className="font-mono text-xs font-medium text-heading">{d.licenseNumber}</p>
                      <p className="text-xs text-body/70">{d.specialty}</p>
                    </div>
                  </Td>
                  <Td className="text-sm">{d.facility}</Td>
                  <Td>
                    <span className="inline-flex items-center rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {d.user._count.patientsAsDietitian}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={statusTone[d.approvalStatus]}>{d.approvalStatus}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg"
                            disabled={updatingId === d.id}
                            aria-label="Dietitian actions"
                          >
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/dietitians/${d.id}`} className="flex items-center gap-2">
                              <ExternalLink size={14} />
                              <span>View details</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {d.approvalStatus !== "APPROVED" && (
                            <DropdownMenuItem onClick={() => updateStatus(d.id, "APPROVED")}>
                              <CheckCircle2 size={14} className="text-primary" />
                              <span>Approve</span>
                            </DropdownMenuItem>
                          )}
                          {d.approvalStatus !== "REJECTED" && (
                            <DropdownMenuItem onClick={() => updateStatus(d.id, "REJECTED")}>
                              <XCircle size={14} className="text-amber-600" />
                              <span>Reject</span>
                            </DropdownMenuItem>
                          )}
                          {d.approvalStatus !== "SUSPENDED" && (
                            <DropdownMenuItem variant="danger" onClick={() => updateStatus(d.id, "SUSPENDED")}>
                              <Ban size={14} />
                              <span>Suspend</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
        {filtered && filtered.length > 0 ? (
          <Pagination {...pager} onPageChange={pager.setPage} noun="dietitians" className="border-t border-gray-200 px-5 py-3" />
        ) : null}
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
