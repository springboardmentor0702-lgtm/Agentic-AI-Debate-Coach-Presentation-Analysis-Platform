"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';

/**
 * Polls GET /dashboards/overview and keeps the analytics envelope fresh.
 *
 * Two details that matter:
 * - The poll interval comes from the server (`refresh_seconds`), so the cadence
 *   is tuned in one place rather than hardcoded per page.
 * - A request counter guards against out-of-order responses. Without it a slow
 *   earlier poll can land after a faster later one and show stale numbers.
 */
export default function useAnalytics({ path = '/dashboards/overview', enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setRefreshing(true);
    try {
      const payload = await (await apiFetch(path)).json();
      if (!mounted.current || id !== requestId.current) return; // a newer poll already won
      setData(payload);
      setError('');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return;
      setError(err.message || 'Could not reach the analytics API.');
    } finally {
      if (mounted.current && id === requestId.current) setRefreshing(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    return undefined;
  }, [load, enabled]);

  const intervalSeconds = data?.refresh_seconds || 20;
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(load, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [load, intervalSeconds, enabled]);

  return { data, error, refreshing, lastUpdated, refresh: load };
}
