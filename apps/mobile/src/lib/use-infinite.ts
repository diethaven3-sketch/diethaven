import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface InfiniteQuery<T> {
  items: T[];
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Cursor-paged GET for endpoints that accept `limit` + `cursor` (the id of the
 * last row already held) and return rows newest-first. A short page means the
 * end has been reached.
 */
export function useInfiniteApiQuery<T extends { id: string }>(path: string, pageSize = 20): InfiniteQuery<T> {
  const { token } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  // Scroll events fire in bursts; this stops one burst requesting the same page twice.
  const inFlight = useRef(false);
  // Bumped on every first-page load so a slow "more" response can't append to a refreshed list.
  const generation = useRef(0);

  const url = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (cursor) params.set("cursor", cursor);
      return `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
    },
    [path, pageSize],
  );

  useEffect(() => {
    if (!token) return;
    const gen = ++generation.current;
    inFlight.current = true;

    (async () => {
      try {
        const page = await apiFetch<T[]>(url(), { token });
        if (gen !== generation.current) return;
        setItems(page);
        setHasMore(page.length === pageSize);
        setError(null);
      } catch (err) {
        if (gen !== generation.current) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load this right now.");
      } finally {
        if (gen === generation.current) {
          inFlight.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
  }, [token, url, pageSize, reloadKey]);

  const loadMore = useCallback(() => {
    const last = items[items.length - 1];
    if (!token || !hasMore || inFlight.current || !last) return;
    const gen = generation.current;
    inFlight.current = true;
    setLoadingMore(true);

    (async () => {
      try {
        const page = await apiFetch<T[]>(url(last.id), { token });
        if (gen !== generation.current) return;
        setItems((prev) => [...prev, ...page]);
        setHasMore(page.length === pageSize);
      } catch (err) {
        if (gen !== generation.current) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load more right now.");
      } finally {
        if (gen === generation.current) {
          inFlight.current = false;
          setLoadingMore(false);
        }
      }
    })();
  }, [token, hasMore, items, url, pageSize]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  return { items, error, loading, refreshing, loadingMore, hasMore, loadMore, refetch };
}

/**
 * Infinite scroll over a list that is already fully loaded: reveals `step`
 * more rows each time the end is reached, so long lists don't render at once.
 */
export function useIncrementalList<T>(items: readonly T[], step = 15) {
  const [count, setCount] = useState(step);
  const visible = items.slice(0, count);
  const hasMore = count < items.length;
  const loadMore = useCallback(() => setCount((c) => c + step), [step]);
  return { visible, hasMore, loadMore };
}
