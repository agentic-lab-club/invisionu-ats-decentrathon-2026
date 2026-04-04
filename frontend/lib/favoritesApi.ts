// lib/favoritesApi.ts
// HTTP client for the /favorites backend endpoints.
// All calls go through Next.js rewrite: /api/backend/* → BACKEND_INTERNAL_URL/*

const BACKEND = '/api/backend';

/** GET /favorites — returns the list of candidate IDs saved by the current admin. */
export async function fetchFavoriteIds(token: string): Promise<string[]> {
  const res = await fetch(`${BACKEND}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.ids) ? (data.ids as string[]) : [];
}

/** POST /favorites — adds a candidate to favorites. */
export async function addFavorite(token: string, candidateId: string): Promise<void> {
  const res = await fetch(`${BACKEND}/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ candidate_id: candidateId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? 'Failed to add favorite');
  }
}

/** DELETE /favorites/:candidateId — removes a candidate from favorites. */
export async function removeFavorite(token: string, candidateId: string): Promise<void> {
  const res = await fetch(`${BACKEND}/favorites/${candidateId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? 'Failed to remove favorite');
  }
}