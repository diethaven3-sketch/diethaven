"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";
import { inviteRequestSchema, validateWithSchema, type InviteCreated } from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../ui/button";
import { Banner } from "../ui/banner";
import { Field } from "../ui/input";

/** Copies text to the clipboard and flips to a "Copied" state for a moment. */
export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  className,
}: {
  text: string;
  label?: string;
  variant?: "outline" | "primary" | "ghost";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API is blocked on non-secure origins; fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" variant={variant} onClick={copy} className={clsx("shrink-0", className)} aria-live="polite">
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function shareMessage(inviteUrl: string, dietitianName?: string) {
  const from = dietitianName ? `${dietitianName} has` : "Your dietitian has";
  return `${from} invited you to DietHaven Consult. Open this link to set up your account: ${inviteUrl}`;
}

/** The link, a ready-to-send message, and the raw code for manual entry in the app. */
export function SharePanel({ invite, dietitianName }: { invite: Pick<InviteCreated, "email" | "inviteUrl" | "code" | "expiresAt">; dietitianName?: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-surface-alt/50 p-4">
      <p className="text-sm font-semibold text-heading">Share this invite with {invite.email}</p>
      <p className="mt-0.5 text-xs text-body/70">
        We&apos;ve emailed it too. You can also send it on WhatsApp or SMS. It works once and expires{" "}
        {new Date(invite.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.
      </p>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-heading/80" htmlFor="invite-link">
        Invite link
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="invite-link"
          readOnly
          value={invite.inviteUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-body"
        />
        <CopyButton text={invite.inviteUrl} label="Copy link" variant="primary" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={shareMessage(invite.inviteUrl, dietitianName)} label="Copy message" />
        <CopyButton text={invite.code} label="Copy invite code" variant="ghost" />
      </div>
    </div>
  );
}

export function InvitePatientForm({ onInvited }: { onInvited: () => void }) {
  const { token, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<InviteCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);
    setCreated(null);

    const validation = validateWithSchema(inviteRequestSchema, { email: email.trim() });
    if (!validation.success) {
      setFieldError(validation.errors.email);
      setError(validation.firstError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<InviteCreated>("/dietitian/invites", {
        method: "POST",
        token,
        body: validation.data,
      });
      setCreated(res);
      setEmail("");
      onInvited();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fieldErrors.email) setFieldError(err.fieldErrors.email);
      } else {
        setError("Failed to send invite.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit} noValidate>
        <div className="flex-1">
          <Field
            label="Patient email"
            type="email"
            name="invite-email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(undefined);
              if (error) setError(null);
            }}
            error={fieldError}
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
      {created ? (
        <div className="mt-4">
          <SharePanel invite={created} dietitianName={profile?.name} />
        </div>
      ) : null}
    </>
  );
}
