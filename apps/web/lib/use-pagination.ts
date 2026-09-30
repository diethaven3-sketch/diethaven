"use client";

import { useMemo, useState } from "react";

/**
 * Client-side pagination over an already-loaded list.
 *
 * Most endpoints return a dietitian's or patient's full list (the monitoring
 * maths and the mobile app need it whole), so paging happens here rather than
 * in the API.
 *
 * `resetKey` should change whenever a filter or search changes, so the user
 * isn't left on page 4 of a list that now has one page. It must be a primitive
 * (e.g. `${search}|${status}`) because it is compared by identity.
 */
export function usePagination<T>(items: readonly T[], pageSize = 10, resetKey: string | number = "") {
  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset during render rather than in an effect, so the stale page is never painted.
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  // Deleting the last row on the last page shouldn't strand the user on an empty page.
  const current = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  return {
    page: current,
    setPage,
    pageItems,
    total,
    totalPages,
    start: total === 0 ? 0 : (current - 1) * pageSize + 1,
    end: Math.min(current * pageSize, total),
  };
}
