"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import type { InviteListItem, InviteStatus } from "@repo/types";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AppShell } from "../../../components/app-shell";
import { Badge } from "../../../components/ui/badge";
import { Banner } from "../../../components/ui/banner";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Modal } from "../../../components/ui/modal";
import { Pagination } from "../../../components/ui/pagination";
import { usePagination } from "../../../lib/use-pagination";
import { TableSkeleton } from "../../../components/ui/skeleton";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";
import { CopyButton, InvitePatientForm, shareMessage } from "../../../components/invites/invite-form";

const STATUS_LABELS: Record<InviteStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
};

const statusTone = { PENDING: "warning", ACCEPTED: "success", EXPIRED: "neutral" } as const;

type Filter = "ALL" | InviteStatus;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function expiresIn(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 1) return "Expires within a day";
  return `Expires in ${days} days`;
}

function InvitesPage() {
  const { token, profile } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<InviteListItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<InviteListItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([
        apiFetch<{ approvalStatus: string }>("/dietitian/me", { token }),
        apiFetch<InviteListItem[]>("/dietitian/invites", { token }),
      ]);
      setApproved(me.approvalStatus === "APPROVED");
      setInvites(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load invites.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setRevoking(true);
    setError(null);
    try {
      await apiFetch(`/dietitian/invites/${id}/revoke`, { method: "POST", token });
      setConfirmRevoke(null);
      await load();
    } catch (err) {
      setConfirmRevoke(null);
      setError(err instanceof ApiError ? err.message : "Failed to revoke invite.");
    } finally {
      setRevoking(false);
    }
  };

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { ALL: 0, PENDING: 0, ACCEPTED: 0, EXPIRED: 0 };
    for (const invite of invites ?? []) {
      result.ALL += 1;
      result[invite.status] += 1;
    }
    return result;
  }, [invites]);

  const visible = useMemo(
    () => (invites ?? []).filter((invite) => filter === "ALL" || invite.status === filter),
    [invites, filter],
  );
  const pager = usePagination(visible, 10, filter);

  return (
    <AppShell title="Patient invites">
      <h2 className="text-2xl font-bold text-heading">Invites</h2>
      <p className="mt-1 text-sm text-body/75">
        Invite patients by email, or copy their link to share on WhatsApp or SMS.
      </p>

      {error ? (
        <Banner tone="danger" className="mt-6">
          {error}
        </Banner>
      ) : null}

      <Card className="mt-6">
        <h3 className="text-base font-bold text-heading">Invite a patient</h3>
        <p className="mt-0.5 mb-4 text-xs text-body/70">
          The invite is tied to this email address: the patient signs up with it, and the link works once.
        </p>
        {approved === false ? (
          <Banner tone="warning">Your account is pending admin approval. You can invite patients once approved.</Banner>
        ) : (
          <InvitePatientForm onInvited={load} />
        )}
      </Card>

      <Card className="mt-6 p-0">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-heading">Sent invites</h3>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter invites by status">
            {(["ALL", "PENDING", "ACCEPTED", "EXPIRED"] as Filter[]).map((option) => (
              <button
                key={option}
                role="tab"
                aria-selected={filter === option}
                onClick={() => setFilter(option)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === option ? "bg-primary text-white" : "bg-surface text-body hover:bg-surface-alt"
                }`}
              >
                {option === "ALL" ? "All" : STATUS_LABELS[option]} ({counts[option]})
              </button>
            ))}
          </div>
        </div>

        {invites === null ? (
          error ? null : <TableSkeleton columns={4} rows={3} />
        ) : invites.length === 0 ? (
          <EmptyState icon={Mail} title="No invites yet" description="Invites you send appear here with their link." />
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-body">No {STATUS_LABELS[filter as InviteStatus].toLowerCase()} invites.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                  <Th className="text-right">Share</Th>
                </tr>
              </Thead>
              <Tbody>
                {pager.pageItems.map((invite) => (
                  <tr key={invite.id}>
                    <Td className="font-medium text-heading">{invite.email}</Td>
                    <Td>
                      <Badge tone={statusTone[invite.status]}>{STATUS_LABELS[invite.status]}</Badge>
                      <p className="mt-1 text-xs text-body/70">
                        {invite.status === "PENDING"
                          ? expiresIn(invite.expiresAt)
                          : invite.status === "ACCEPTED" && invite.acceptedAt
                            ? `Joined ${formatDate(invite.acceptedAt)}`
                            : "Link no longer works"}
                      </p>
                    </Td>
                    <Td>{formatDate(invite.createdAt)}</Td>
                    <Td>
                      {invite.inviteUrl ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <CopyButton text={invite.inviteUrl} label="Copy link" variant="primary" />
                          <CopyButton text={shareMessage(invite.inviteUrl, profile?.name)} label="Copy message" />
                          <Button
                            variant="ghost"
                            className="text-red-700 hover:bg-red-50"
                            onClick={() => setConfirmRevoke(invite)}
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-body/60">—</p>
                      )}
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
            <Pagination {...pager} onPageChange={pager.setPage} noun="invites" className="border-t border-gray-200 px-5 py-3" />
          </div>
        )}
      </Card>

      <Modal
        title="Revoke this invite?"
        description={confirmRevoke ? `The link sent to ${confirmRevoke.email} will stop working immediately.` : undefined}
        isOpen={confirmRevoke !== null}
        onClose={() => (revoking ? undefined : setConfirmRevoke(null))}
        maxWidth="md"
      >
        <p className="text-sm text-body">
          This can&apos;t be undone. If they still need access, you&apos;ll have to send a new invite.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmRevoke(null)} disabled={revoking}>
            Keep invite
          </Button>
          <Button variant="danger" loading={revoking} onClick={() => confirmRevoke && void revoke(confirmRevoke.id)}>
            Revoke invite
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function DietitianInvitesPage() {
  return (
    <RequireRole role="DIETITIAN">
      <InvitesPage />
    </RequireRole>
  );
}
