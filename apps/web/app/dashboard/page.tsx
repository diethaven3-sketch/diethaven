"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { inviteRequestSchema } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { RequireRole } from "../../components/require-role";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { Banner } from "../../components/ui/banner";
import { Card } from "../../components/ui/card";
import { Field } from "../../components/ui/input";
import { Table, Thead, Tbody, Th, Td } from "../../components/ui/table";

interface DietitianProfile {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  licenseNumber: string;
  specialty: string;
  facility: string;
}

interface PatientRow {
  userId: string;
  dateOfBirth: string;
  sex: string;
  createdAt: string;
  user: { name: string; email: string };
}

function InvitePatientForm({ onInvited }: { onInvited: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; devToken?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const parsed = inviteRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ email: string; devToken?: string }>("/dietitian/invites", {
        method: "POST",
        token,
        body: { email },
      });
      setResult(res);
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <h3 className="text-lg font-bold text-heading">Invite a patient</h3>
      <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit} noValidate>
        <div className="flex-1">
          <Field
            label="Patient email"
            type="email"
            name="invite-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" loading={submitting}>
          Send invite
        </Button>
      </form>
      {error ? (
        <Banner tone="danger" className="mt-3">
          {error}
        </Banner>
      ) : null}
      {result ? (
        <Banner tone="success" className="mt-3">
          Invite created for {result.email}.
          {result.devToken ? (
            <>
              {" "}
              Dev-only accept link token: <code className="font-mono">{result.devToken}</code>
            </>
          ) : null}
        </Banner>
      ) : null}
    </Card>
  );
}

function DietitianDashboard() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<DietitianProfile | null>(null);
  const [patients, setPatients] = useState<PatientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileRes, patientsRes] = await Promise.all([
        apiFetch<DietitianProfile>("/dietitian/me", { token }),
        apiFetch<PatientRow[]>("/dietitian/patients", { token }),
      ]);
      setProfile(profileRes);
      setPatients(patientsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Dietitian dashboard">
      {profile && profile.approvalStatus !== "APPROVED" ? (
        <Banner tone={profile.approvalStatus === "PENDING" ? "warning" : "danger"} className="mb-6">
          {profile.approvalStatus === "PENDING"
            ? "Your account is pending admin approval. You can invite patients once approved."
            : `Your account is ${profile.approvalStatus.toLowerCase()}. Contact an administrator for details.`}
        </Banner>
      ) : null}

      {error ? (
        <Banner tone="danger" className="mb-6">
          {error}
        </Banner>
      ) : null}

      <h2 className="text-xl font-bold text-heading">My patients</h2>
      <Card className="mt-3 p-0">
        {patients === null ? (
          <p className="p-6 text-sm text-body">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="p-6 text-sm text-body">No linked patients yet. Invite one below.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Date of birth</Th>
                <Th>Sex</Th>
                <Th>Linked</Th>
              </tr>
            </Thead>
            <Tbody>
              {patients.map((p) => (
                <tr key={p.userId}>
                  <Td>
                    <Link href={`/dashboard/patients/${p.userId}`} className="font-semibold text-primary hover:underline">
                      {p.user.name}
                    </Link>
                  </Td>
                  <Td>{p.user.email}</Td>
                  <Td>{new Date(p.dateOfBirth).toLocaleDateString()}</Td>
                  <Td>{p.sex}</Td>
                  <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <InvitePatientForm onInvited={load} />
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
