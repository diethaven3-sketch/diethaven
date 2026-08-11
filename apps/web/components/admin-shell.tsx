"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserCheck, Apple, ScrollText, Settings, LogOut } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/dietitians", label: "Dietitians", icon: UserCheck },
  { href: "/admin/food-exchange", label: "Food Exchange List", icon: Apple },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-white md:flex">
        <div className="px-6 py-6">
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            DietHaven Consult
          </p>
          <p className="text-xs text-white/70">Admin console</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          {user ? <p className="truncate px-3 pb-2 text-xs text-white/70">{user.email}</p> : null}
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar + horizontal nav */}
        <div className="md:hidden">
          <header className="flex items-center justify-between border-b border-gray-200 bg-primary px-4 py-4 text-white">
            <p className="font-bold">{title}</p>
            <button onClick={handleLogout} aria-label="Log out" className="cursor-pointer p-1">
              <LogOut size={20} aria-hidden />
            </button>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    active ? "bg-surface-alt text-primary-dark" : "text-body hover:bg-surface-alt",
                  )}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
