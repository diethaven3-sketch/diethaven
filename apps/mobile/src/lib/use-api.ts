import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ApiQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
}

/**
 * Fetches an authenticated GET endpoint, and re-fetches when `refetch` is called.
 * `loading` covers the first load only, so a pull-to-refresh doesn't blank the
 * screen — drive the RefreshControl from `refreshing` instead.
 */
export function useApiQuery<T>(path: string): ApiQuery<T> {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    // Guards against a response landing after unmount, or after `path` changed.
    let cancelled = false;

    (async () => {
      try {
        const result = await apiFetch<T>(path, { token });
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load this right now.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, token, reloadKey]);

  const refetch = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  return { data, error, loading, refreshing, refetch };
}
