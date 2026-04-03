'use client';

import { useCallback, useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';

const STORAGE_KEY_PREFIX = 'favorites_';

function getKey(): string {
  const user = getStoredUser();
  return `${STORAGE_KEY_PREFIX}${user?.id ?? 'guest'}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once mounted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getKey());
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setFavorites(new Set(ids));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Persist whenever favorites change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(getKey(), JSON.stringify([...favorites]));
    } catch {
      // ignore
    }
  }, [favorites, loaded]);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const add = useCallback((id: string) => {
    setFavorites((prev) => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const favoriteIds = [...favorites];

  return { favorites, favoriteIds, isFavorite, toggle, add, remove, loaded };
}
