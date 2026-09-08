"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Patients", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        <nav className="mx-auto flex max-w-6xl gap-1 px-6" aria-label="Main">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "border-secondary text-white"
                    : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
