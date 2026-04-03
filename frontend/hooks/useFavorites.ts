'use client';

// hooks/useFavorites.ts
// Syncs favorites with the backend instead of localStorage.
// Uses optimistic updates so the UI stays instant — the API call happens in the
// background and reverts the local state if the server returns an error.

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { fetchFavoriteIds, addFavorite, removeFavorite } from '@/lib/favoritesApi';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // ── Initial load from backend ──────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoaded(true);
      return;
    }
    fetchFavoriteIds(token)
      .then((ids) => setFavorites(new Set(ids)))
      .catch(() => {
        // If the request fails (e.g. network error) we just start with an
        // empty set — the user can still interact and retries will happen
        // on the next page load.
      })
      .finally(() => setLoaded(true));
  }, []);

  // ── Derived helpers ────────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  // ── add ───────────────────────────────────────────────────────────────────
  const add = useCallback((id: string) => {
    // Optimistic: update UI immediately
    setFavorites((prev) => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });

    const token = getAccessToken();
    if (!token) return;

    addFavorite(token, id).catch(() => {
      // Revert on error
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }, []);

  // ── remove ────────────────────────────────────────────────────────────────
  const remove = useCallback((id: string) => {
    // Optimistic: update UI immediately
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    const token = getAccessToken();
    if (!token) return;

    removeFavorite(token, id).catch(() => {
      // Revert on error
      setFavorites((prev) => new Set([...prev, id]));
    });
  }, []);

  // ── toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(
    (id: string) => {
      if (favorites.has(id)) remove(id);
      else add(id);
    },
    [favorites, add, remove],
  );

  const favoriteIds = [...favorites];

  return { favorites, favoriteIds, isFavorite, toggle, add, remove, loaded };
}