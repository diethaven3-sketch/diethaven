"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight, ShieldCheck, FilterX } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { CustomSelect } from "../../../components/ui/custom-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { TableSkeleton } from "../../../components/ui/skeleton";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";

type AuditAction = "CREATE" | "UPDATE" | "VIEW";

interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  user: { id: string; name: string; email: string; role: string };
}

interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const actionTone: Record<AuditAction, "success" | "info" | "neutral"> = {
  CREATE: "success",
  UPDATE: "info",
  VIEW: "neutral",
};

const entityTypeOptions = [
  { value: "ALL", label: "All Entity Types" },
  { value: "PatientProfile", label: "Patient Profile" },
  { value: "Assessment", label: "Assessment" },
  { value: "Diagnosis", label: "Diagnosis" },
  { value: "Intervention", label: "Intervention" },
];

const actionOptions = [
  { value: "ALL", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "VIEW", label: "View" },
];

function AuditLogPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (entityType !== "ALL") params.set("entityType", entityType);
      if (action !== "ALL") params.set("action", action);
      const res = await apiFetch<AuditLogResponse>(`/admin/audit-logs?${params.toString()}`, { token });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load audit log.");
    }
  }, [token, entityType, action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminShell title="Audit log">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
              Audit Log
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-primary">
              <ShieldCheck size={13} />
              NDPA 2023 Compliant
            </span>
          </div>
          <p className="mt-1 text-sm text-body/75">
            Immutable log recording every create, edit, and access event on patient clinical data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-48">
            <CustomSelect
              value={entityType}
              onValueChange={(val) => {
                setPage(1);
                setEntityType(val);
              }}
              options={entityTypeOptions}
            />
          </div>
          <div className="w-full sm:w-40">
            <CustomSelect
              value={action}
              onValueChange={(val) => {
                setPage(1);
                setAction(val);
              }}
              options={actionOptions}
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
        {data !== null && (
          <p>
            Showing <span className="font-semibold text-heading">{data.entries.length}</span> of{" "}
            <span className="font-semibold text-heading">{data.total}</span> total entries
          </p>
        )}
      </div>

      <Card className="mt-2 p-0 overflow-hidden shadow-xs border-gray-200">
        {data === null ? (
          <TableSkeleton columns={5} rows={8} />
        ) : data.entries.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No matching audit entries"
            description={
              entityType !== "ALL" || action !== "ALL"
                ? "No audit records match the selected filters. Try changing or clearing your criteria."
                : "No audit records logged in the system yet."
            }
            action={
              entityType !== "ALL" || action !== "ALL" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEntityType("ALL");
                    setAction("ALL");
                    setPage(1);
                  }}
                  className="text-xs flex items-center gap-1.5"
                >
                  <FilterX size={14} />
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Actor & Role</Th>
                <Th>Action</Th>
                <Th>Entity Type</Th>
                <Th>Entity ID</Th>
              </tr>
            </Thead>
            <Tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors">
                  <Td className="text-xs whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-heading">{entry.user.name}</span>
                      <span className="text-2xs text-body/60">
                        {entry.user.email} • {entry.user.role}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={actionTone[entry.action]}>{entry.action}</Badge>
                  </Td>
                  <Td className="font-medium text-sm text-heading">{entry.entityType}</Td>
                  <Td className="font-mono text-xs text-body/70">{entry.entityId}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      {data && data.total > data.pageSize ? (
        <div className="mt-4 flex items-center justify-between text-sm text-body">
          <span className="text-xs text-body/70">
            Page <span className="font-semibold text-heading">{data.page}</span> of{" "}
            <span className="font-semibold text-heading">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs flex items-center gap-1 px-3 py-1.5"
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs flex items-center gap-1 px-3 py-1.5"
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <AuditLogPage />
    </RequireRole>
  );
}
