"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { SelectField } from "../../../components/ui/select";
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

function AuditLogPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Audit log</h2>
          <p className="mt-1 text-sm text-body">Every create, edit, and view of patient records and assessments.</p>
        </div>
        <div className="flex gap-3">
          <SelectField
            label="Entity type"
            name="entityType"
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="PatientProfile">PatientProfile</option>
            <option value="Assessment">Assessment</option>
          </SelectField>
          <SelectField
            label="Action"
            name="action"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value as AuditAction | "");
            }}
          >
            <option value="">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="VIEW">View</option>
          </SelectField>
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      <Card className="mt-6 p-0">
        {data === null ? (
          <p className="p-6 text-sm text-body">Loading…</p>
        ) : data.entries.length === 0 ? (
          <p className="p-6 text-sm text-body">No matching audit entries.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity type</Th>
                <Th>Entity ID</Th>
              </tr>
            </Thead>
            <Tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <Td>{new Date(entry.timestamp).toLocaleString()}</Td>
                  <Td>
                    {entry.user.name} <span className="text-body/60">({entry.user.role})</span>
                  </Td>
                  <Td>
                    <Badge tone={actionTone[entry.action]}>{entry.action}</Badge>
                  </Td>
                  <Td>{entry.entityType}</Td>
                  <Td className="font-mono text-xs">{entry.entityId}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      {data && data.total > data.pageSize ? (
        <div className="mt-4 flex items-center justify-between text-sm text-body">
          <span>
            Page {data.page} of {totalPages} ({data.total} entries)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
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
