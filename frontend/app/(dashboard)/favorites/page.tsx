'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart, Users, ChevronRight, ChevronsUpDown,
  ArrowUpDown, SlidersHorizontal, UserCircle2,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import FavoriteButton from '@/components/ui/FavoriteButton';

const API_URL = '/api/backend';

// ── Types ──────────────────────────────────────────────────────────────────
interface Candidate {
  application_id: string;
  full_name: string;
  program_name: string;
  overall_score: number;
  is_mock_potential: boolean;
  backendReviewStage: string;
  backendDecision?: string;
  uiStatus: string;
  recommendation?: string;
  ai_probability?: number;
  ielts_score?: number;
  ent_score?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fee2e2', text: '#991b1b' },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
}

function buildMockPotential(id: string) { return 45 + (hashString(id) % 51); }
const reviewStageMapping: Record<string, string> = {
  initial_screening: 'new',
  application_review: 'review',
  decision: 'decision',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCandidate(item: any): Candidate {
  const backendReviewStage = item.review_stage;
  const backendDecision = item.decision;
  let uiStatus = reviewStageMapping[backendReviewStage] ?? 'new';
  if (uiStatus === 'decision') {
    if (backendDecision === 'accepted') uiStatus = 'recommended';
    else if (backendDecision === 'rejected') uiStatus = 'rejected';
    else uiStatus = 'review';
  }
  return {
    application_id: item.application_id,
    full_name: item.full_name,
    program_name: item.program_name,
    overall_score: item.overall_score > 0
      ? item.overall_score
      : buildMockPotential(item.application_id),
    is_mock_potential: !(item.overall_score > 0),
    backendReviewStage,
    backendDecision,
    uiStatus,
    recommendation: item.recommendation,
    ai_probability: item.ai_probability ?? undefined,
    ielts_score: item.ielts_score ?? undefined,
    ent_score: item.ent_score ?? undefined,
  };
}

function formatAIProbability(value?: number) {
  return value != null ? `${value.toFixed(1)}%` : '—';
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const { bg, text } = avatarColor(name);
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
      style={{ background: bg, color: text }}
    >
      {getInitials(name)}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? '#b5e220' : pct >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-5">
            <div className="w-6 h-6 bg-gray-100 rounded animate-pulse flex-shrink-0" />
            <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
            <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse ml-auto" />
            <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-5 w-20 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function FavoritesPage() {
  const { favoriteIds, loaded: favLoaded } = useFavorites();

  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [fetching, setFetching] = useState(false);

  const [sortField, setSortField] = useState<'full_name' | 'program_name' | 'overall_score'>('overall_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch the full candidate list once (same endpoint as the dashboard table)
  useEffect(() => {
    if (!favLoaded) return;

    const token = getAccessToken();
    if (!token || favoriteIds.length === 0) {
      setAllCandidates([]);
      return;
    }

    let cancelled = false;
    setFetching(true);

    fetch(`${API_URL}/candidates`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        setAllCandidates(items.map(mapCandidate));
      })
      .catch(() => { if (!cancelled) setAllCandidates([]); })
      .finally(() => { if (!cancelled) setFetching(false); });

    return () => { cancelled = true; };
  }, [favLoaded, favoriteIds.length]);

  // Filter to only favorites
  const favSet = new Set(favoriteIds);
  const favorites = allCandidates.filter(c => favSet.has(c.application_id));

  // Status filter
  const filtered = favorites.filter(c =>
    filterStatus === 'all' || c.uiStatus === filterStatus,
  );

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (sortField === 'full_name')       { av = a.full_name;    bv = b.full_name; }
    else if (sortField === 'program_name') { av = a.program_name; bv = b.program_name; }
    else                                   { av = a.overall_score; bv = b.overall_score; }
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const counts = favorites.reduce<Record<string, number>>((acc, c) => {
    acc[c.uiStatus] = (acc[c.uiStatus] ?? 0) + 1;
    return acc;
  }, {});

  const isLoading = !favLoaded || fetching;
  const isEmpty   = favLoaded && favoriteIds.length === 0;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const statusFilterButtons = [
    { value: 'all',         label: 'All',         color: '' },
    { value: 'new',         label: 'New',         color: 'bg-blue-100 text-blue-800' },
    { value: 'review',      label: 'In Review',   color: 'bg-amber-100 text-amber-800' },
    { value: 'recommended', label: 'Recommended', color: 'bg-[#b5e220]/15 text-[#6a8a10]' },
    { value: 'rejected',    label: 'Rejected',    color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="w-full mx-auto py-2 space-y-6">
      {/* ── Header ── */}
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

      {/* ── Content ── */}
      {isLoading ? (
        <TableSkeleton />
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
        /* ── Full table (same style as CandidatesTable) ── */
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

          {/* Table toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                {sorted.length} saved candidate{sorted.length !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
                {statusFilterButtons.map(s => {
                  const count = s.value === 'all' ? favorites.length : (counts[s.value] ?? 0);
                  const isActive = filterStatus === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setFilterStatus(s.value)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        isActive && s.value !== 'all'
                          ? s.color
                          : isActive
                          ? 'bg-gray-100 text-gray-700'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {s.value !== 'all' && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-current' : 'bg-gray-300'}`} />
                      )}
                      {s.label}
                      {count > 0 && (
                        <span className={`text-[10px] tabular-nums ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-300" />
              <div className="relative">
                <select
                  value={sortField}
                  onChange={e => { setSortField(e.target.value as typeof sortField); setSortDir('desc'); }}
                  className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 appearance-none cursor-pointer transition-all"
                >
                  <option value="overall_score">Sort by Potential</option>
                  <option value="full_name">Sort by Name</option>
                  <option value="program_name">Sort by Program</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
              >
                <ChevronsUpDown
                  className="w-3.5 h-3.5 text-gray-400"
                  style={{ transform: sortDir === 'asc' ? 'scaleY(-1)' : 'none', transition: 'transform 0.15s' }}
                />
              </button>
            </div>
          </div>

{/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pl-6 py-3 w-8" />
                  <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Candidate</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('program_name')}>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Program</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('overall_score')}>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Potential</span>
                      <ChevronsUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">AI Probability</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">IELTS</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">ENT</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</span>
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UserCircle2 className="w-8 h-8 text-gray-200" />
                        <p className="text-sm text-gray-400">No candidates match this filter</p>
                        <button
                          onClick={() => setFilterStatus('all')}
                          className="text-xs text-[#8aaa18] hover:underline mt-1"
                        >
                          Clear filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map(c => (
                    <tr
                      key={c.application_id}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
                      <td className="pl-6 py-3.5 w-8">
                        <FavoriteButton candidateId={c.application_id} variant="icon" />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.full_name} />
                          <span className="text-sm font-medium text-gray-900 leading-tight">
                            {c.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
                          {c.program_name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <ScoreBar score={c.overall_score} />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {c.ai_probability != null ? (
                          <span
                            className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md"
                            style={
                              c.ai_probability >= 50
                                ? { background: '#fef2f2', color: '#dc2626' }
                                : c.ai_probability >= 20
                                ? { background: '#fffbeb', color: '#d97706' }
                                : { background: '#eff6ff', color: '#2563eb' }
                            }
                          >
                            {formatAIProbability(c.ai_probability)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {c.ielts_score != null ? (
                          <span
                            className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md"
                            style={
                              c.ielts_score >= 6.5
                                ? { background: '#f7fde8', color: '#4d7c0f' }
                                : c.ielts_score >= 5.5
                                ? { background: '#fffbeb', color: '#d97706' }
                                : { background: '#fef2f2', color: '#dc2626' }
                            }
                          >
                            {c.ielts_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {c.ent_score != null ? (
                          <span
                            className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md"
                            style={{ background: '#f3f4f6', color: '#374151' }}
                          >
                            {c.ent_score}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <StatusBadge
                          reviewStage={c.backendReviewStage}
                          decision={c.backendDecision}
                        />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <Link
                          href={`/candidate/${c.application_id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-[#8aaa18] transition-colors group-hover:text-gray-500"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
