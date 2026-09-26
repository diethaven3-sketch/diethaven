"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { updateProfileSchema, changePasswordSchema } from "@repo/types";
import { Camera, Trash2, UploadCloud } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api-client";
import { useAuth, type UserProfile } from "../lib/auth-context";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Banner } from "./ui/banner";
import { Card } from "./ui/card";
import { Field } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

/**
 * Account forms shared by the admin and dietitian settings pages. Both endpoints
 * are role-agnostic and scope to the authenticated user, so the only thing that
 * differs between the two pages is the surrounding shell and role guard.
 */
export function ProfileForm() {
  const { token, setProfile: setGlobalProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<UserProfile>("/auth/profile", { token })
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setPhone(p.phone ?? "");
        setAvatarUrl(p.avatarUrl ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleImageFile = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 320x320 for fast upload and storage
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAvatarUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = updateProfileSchema.safeParse({
      name,
      phone: phone || undefined,
      avatarUrl: avatarUrl ?? null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiFetch<UserProfile>("/auth/profile", {
        method: "PATCH",
        token,
        body: parsed.data,
      });
      setProfile(updated);
      setGlobalProfile(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Profile</h3>
      <p className="mt-1 text-sm text-body/75">Update your photo and personal information.</p>

      {error ? <Banner tone="danger" className="mt-4">{error}</Banner> : null}
      {success ? <Banner tone="success" className="mt-4">Profile updated successfully.</Banner> : null}

      <form className="mt-6 flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {/* Profile picture section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-xl border border-gray-100 bg-surface/50 p-4">
          <div className="relative group">
            <Avatar src={avatarUrl} name={name || profile?.name} size="2xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <Camera size={22} />
            </button>
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-heading">Profile Picture</p>
            <p className="text-xs text-body/70">
              Supports PNG, JPG or WebP up to 5MB. Recommended square aspect ratio.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={14} />
                Upload photo
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="danger"
                  className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              )}
            </div>
            {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
          </div>
        </div>

        <Field label="Full Name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Phone number (optional)" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="Email address" name="email" value={profile?.email ?? ""} disabled />

        <Button type="submit" loading={submitting} className="self-start mt-2">
          Save changes
        </Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", token, body: parsed.data });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-heading">Change password</h3>
      <p className="mt-1 text-sm text-body/75">Use a strong password of at least 8 characters.</p>

      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {success ? <Banner tone="success">Password updated successfully.</Banner> : null}

        <Field
          label="Current password"
          type="password"
          name="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Field
          label="New password"
          type="password"
          name="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" loading={submitting} className="self-start mt-2">
          Update password
        </Button>
      </form>
    </Card>
  );
}
