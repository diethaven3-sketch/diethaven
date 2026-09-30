"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Smartphone } from "lucide-react";
import { inviteAppLink, type InvitePreview } from "@repo/types";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { CopyButton } from "../../../components/invites/invite-form";

/**
 * Public landing page for a shared invite link. Patients register in the
 * mobile app, so this page hands the invite over to it: a deep link that opens
 * the accept-invite screen pre-filled, and the code for manual entry.
 */
export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<InvitePreview>(`/invites/${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "We couldn't load this invite."));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold text-primary">DietHaven Consult</p>
        <p className="text-xs text-body/60">Your Food, Your Medicine</p>

        {error ? (
          <>
            <h1 className="mt-6 text-2xl font-bold">Invite not found</h1>
            <Banner tone="danger" className="mt-4">
              This link isn&apos;t valid. Ask your dietitian to send you a new one.
            </Banner>
          </>
        ) : !preview ? (
          <p className="mt-6 text-sm text-body">Loading your invite…</p>
        ) : preview.expired ? (
          <>
            <h1 className="mt-6 text-2xl font-bold">This invite has expired</h1>
            <p className="mt-2 text-sm text-body">
              It was already used, revoked, or is past its expiry date. Ask {preview.dietitianName} to send you a
              new invite.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold">You&apos;re invited</h1>
            <p className="mt-2 text-sm text-body">
              <strong>{preview.dietitianName}</strong> has invited you to DietHaven Consult to manage your nutrition
              care plan and log your meals. Your account will use <strong>{preview.maskedEmail}</strong>, and the app will email a code there to confirm it&apos;s you.
            </p>

            <a
              href={inviteAppLink(token)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Smartphone size={16} aria-hidden />
              Open in the DietHaven app
            </a>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-heading">Button didn&apos;t work?</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-body">
                <li>Install and open the DietHaven Consult app.</li>
                <li>Choose &ldquo;I have an invite&rdquo;.</li>
                <li>Paste this invite code:</li>
              </ol>
              <div className="mt-3 flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-surface px-3 py-2 font-mono text-xs">
                  {token}
                </code>
                <CopyButton text={token} label="Copy code" />
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
