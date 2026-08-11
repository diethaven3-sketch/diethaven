import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "info" | "warning" | "danger" | "success";

const toneClasses: Record<Tone, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  warning: "bg-orange-50 text-secondary-dark border-orange-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  success: "bg-surface-alt text-primary-dark border-primary/20",
};

interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function Banner({ tone = "info", className, ...props }: BannerProps) {
  return (
    <div
      role="status"
      className={clsx("rounded-lg border px-4 py-3 text-sm", toneClasses[tone], className)}
      {...props}
    />
  );
}
