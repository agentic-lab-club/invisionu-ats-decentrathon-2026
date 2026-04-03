'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ExternalLink, Trash2, Users } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Candidate {
  id: string;
  name: string | null;
  program: string | null;
  overall_score: number | null;
  status: string | null;
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    score >= 80
      ? 'bg-[#b5e220]/20 text-[#4d7c0f]'
      : score >= 60
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${color}`}>
      {Math.round(score)}
    </span>
  );
}

export default function FavoritesPage() {
  const { favoriteIds, remove, loaded } = useFavorites();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loaded || favoriteIds.length === 0) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setFetching(true);

    Promise.all(
      favoriteIds.map(async (id) => {
        try {
          const token = getAccessToken();
          const res = await fetch(`${API_URL}/applications/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) return null;
          const data = await res.json();
          return {
            id,
            name:
              [data.first_name, data.last_name].filter(Boolean).join(' ') ||
              data.name ||
              null,
            program: data.program_name ?? data.program ?? null,
            overall_score: data.overall_score ?? null,
            status: data.review_stage ?? data.status ?? null,
          } as Candidate;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setCandidates(results.filter((r): r is Candidate => r !== null));
      setFetching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loaded, favoriteIds.join(',')]);

  const isEmpty = loaded && favoriteIds.length === 0;

  return (
    <div className="w-full mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            inVision University
          </p>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
            <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            </div>
            Favorites
          </h1>
        </div>
        {favoriteIds.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            {favoriteIds.length} saved
          </span>
        )}
      </div>

      {/* Content */}
      {!loaded || fetching ? (
        /* Skeleton */
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 border-b border-gray-50">
              <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
              <div className="h-3 w-40 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded-lg animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        /* Empty state */
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No favorites yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click the{' '}
              <Heart className="inline w-3 h-3 text-gray-400 relative -top-px" /> icon next to
              any candidate to save them here.
            </p>
          </div>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#b5e220]/15 text-[#4d7c0f] rounded-lg hover:bg-[#b5e220]/25 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Browse candidates
          </Link>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
              Saved candidates
            </p>
            <p className="text-[11px] text-gray-400">{favoriteIds.length} total</p>
          </div>

          <div className="divide-y divide-gray-50">
            {candidates.length === 0 && !fetching ? (
              /* Could not load details — show IDs as fallback */
              favoriteIds.map((id) => (
                <div
                  key={id}
                  className="px-6 py-4 flex items-center gap-4 text-xs text-gray-400"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-[10px] font-bold flex-shrink-0">
                    ?
                  </div>
                  <span className="font-mono">{id}</span>
                  <button
                    onClick={() => remove(id)}
                    className="ml-auto p-1.5 rounded-md text-gray-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              candidates.map((c) => {
                const initials = c.name
                  ? c.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : '?';

                return (
                  <div
                    key={c.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-[#b5e220]/20 flex items-center justify-center text-[#4d7c0f] text-[10px] font-bold flex-shrink-0">
                      {initials}
                    </div>

                    {/* Name + program */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {c.name ?? <span className="text-gray-400 italic">Unknown</span>}
                      </p>
                      {c.program && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.program}</p>
                      )}
                    </div>

                    {/* Status */}
                    {c.status && (
                      <div className="hidden sm:block flex-shrink-0">
                        <StatusBadge explicitStatus={c.status} />
                      </div>
                    )}

                    {/* Score */}
                    <div className="flex-shrink-0">
                      <ScorePill score={c.overall_score} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Link
                        href={`/candidate/${c.id}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="View profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => remove(c.id)}
                        className="p-1.5 rounded-md text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Remove from favorites"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
