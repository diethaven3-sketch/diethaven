"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

/** Page numbers to show: first, last, and a window around the current page. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the summary, e.g. "patients". */
  noun?: string;
  className?: string;
}

/** Renders nothing when everything fits on one page. */
export function Pagination({ page, totalPages, total, start, end, onPageChange, noun = "items", className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const button =
    "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={clsx("flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <p className="text-xs text-body/70">
        Showing <span className="font-semibold text-heading">{start}</span>–
        <span className="font-semibold text-heading">{end}</span> of{" "}
        <span className="font-semibold text-heading">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={clsx(button, "gap-1 text-primary hover:bg-surface-alt")}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-body/50" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={clsx(button, p === page ? "bg-primary text-white" : "text-body hover:bg-surface-alt")}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={clsx(button, "gap-1 text-primary hover:bg-surface-alt")}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
