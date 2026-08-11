"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth-context";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              DietHaven Consult
            </p>
            <p className="text-sm text-white/80">{title}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user ? <span className="text-white/90">{user.email}</span> : null}
            <button
              onClick={handleLogout}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-white/90 transition-colors duration-200 hover:bg-white/10"
            >
              <LogOut size={16} aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
