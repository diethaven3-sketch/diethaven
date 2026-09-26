"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  Apple,
  ScrollText,
  Settings,
  LogOut,
  MoreVertical,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../lib/auth-context";
import { Avatar } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  const { user, profile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const displayName = profile?.name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-white md:flex">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <ShieldCheck size={20} className="text-secondary shrink-0" />
          <div>
            <p className="text-base font-bold leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
              DietHaven
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              Admin Console
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
          <p className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-white/50">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-white/20 text-white shadow-xs font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon
                  size={18}
                  aria-hidden
                  className={active ? "text-secondary" : "text-white/70"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User profile dropdown area */}
        <div className="border-t border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors duration-200 hover:bg-white/10 focus:outline-hidden"
              >
                <Avatar
                  src={profile?.avatarUrl}
                  name={displayName}
                  size="sm"
                  className="ring-1 ring-white/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white leading-tight">
                    {displayName}
                  </p>
                  <p className="truncate text-2xs text-white/70">
                    {user?.email}
                  </p>
                </div>
                <MoreVertical size={16} className="text-white/60 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold text-heading">{displayName}</span>
                  <span className="text-xs font-normal text-body/70">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                <Settings size={16} />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar + horizontal nav */}
        <div className="md:hidden">
          <header className="flex items-center justify-between border-b border-gray-200 bg-primary px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <Avatar
                src={profile?.avatarUrl}
                name={displayName}
                size="sm"
                className="ring-1 ring-white/30"
              />
              <div>
                <p className="font-bold text-sm leading-tight">{title}</p>
                <p className="text-2xs text-white/70">Admin console</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="cursor-pointer rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} aria-hidden />
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
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-200",
                    active
                      ? "bg-surface-alt font-semibold text-primary-dark"
                      : "text-body hover:bg-surface-alt",
                  )}
                >
                  <Icon size={15} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 md:px-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
