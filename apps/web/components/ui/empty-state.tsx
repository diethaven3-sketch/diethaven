import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-alt/70 text-primary ring-8 ring-surface-alt/30 transition-transform duration-300 hover:scale-105">
        <Icon size={28} aria-hidden strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-body/75">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
