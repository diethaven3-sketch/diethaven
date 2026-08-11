"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "../lib/auth-context";

export function RequireRole({ role, children }: { role: AuthUser["role"]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== role)) {
      router.replace("/login");
    }
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-body">
        <p>Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
