'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, ChevronsUpDown, SlidersHorizontal,
  UserCircle2, ArrowUpDown,
} from 'lucide-react';

// ================== Types ==================
interface Candidate {
  id: string;
  name: string;
  program: string;
  overallScore: number;
  status: 'new' | 'review' | 'interview' | 'recommended' | 'rejected';
  explanation?: string;
  ielts_score?: number;
}

interface CandidatesTableProps {
  preset?: string | null;
}

// ================== Status config ==================
const STATUS_CONFIG: Record<
  Candidate['status'],
  { label: string; dot: string; pill: string; text: string }
> = {
  new:         { label: 'New',         dot: '#3b82f6', pill: '#eff6ff',   text: '#2563eb' },
  review:      { label: 'In review',   dot: '#f59e0b', pill: '#fffbeb',   text: '#d97706' },
  interview:   { label: 'Interview',   dot: '#8b5cf6', pill: '#f5f3ff',   text: '#7c3aed' },
  recommended: { label: 'Recommended', dot: '#b5e220', pill: '#f7fde8',   text: '#4d7c0f' },
  rejected:    { label: 'Rejected',    dot: '#ef4444', pill: '#fef2f2',   text: '#dc2626' },
};

// ================== Helpers ==================
function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('');
}

// Deterministic pastel bg per name
const AVATAR_COLORS = [
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fee2e2', text: '#991b1b' },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ================== Sub-components ==================
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
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Candidate['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ background: cfg.pill, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

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

// ================== Loading skeleton ==================
function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-5">
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

// ================== Column definitions ==================
const COLUMNS = [
  { field: 'name'         as const, label: 'Candidate',  sortable: true  },
  { field: 'program'      as const, label: 'Program',    sortable: true  },
  { field: 'overallScore' as const, label: 'Potential',  sortable: true  },
  { field: null,                    label: 'IELTS',       sortable: false },
  { field: null,                    label: 'Status',      sortable: false },
  { field: null,                    label: 'Key factors', sortable: false },
];

// ================== Main component ==================
export default function CandidatesTable({ preset }: CandidatesTableProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Candidate>('overallScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    const url = preset
      ? `/api/candidates?preset=${encodeURIComponent(preset)}`
      : '/api/candidates';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setCandidates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setCandidates([]);
        setLoading(false);
      });
  }, [preset]);

  const handleSort = (field: keyof Candidate) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = candidates.filter(
    c => filterStatus === 'all' || c.status === filterStatus,
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortField], bv = b[sortField];
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    if (typeof av === 'number' && typeof bv === 'number')
      return sortDir === 'asc' ? av - bv : bv - av;
    return 0;
  });

  // Status counts for filter bar
  const counts = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-tour="candidates-table">
      {/* ── Toolbar ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
            {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
            {preset && <span className="ml-1.5 text-[#4d7c0f] normal-case tracking-normal">· filtered</span>}
          </p>

          {/* Status quick-filters */}
          <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
            {(['all', 'new', 'review', 'interview', 'recommended', 'rejected'] as const).map(s => {
              const isAll = s === 'all';
              const cfg = isAll ? null : STATUS_CONFIG[s];
              const count = isAll ? candidates.length : (counts[s] ?? 0);
              const isActive = filterStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                  style={
                    isActive && !isAll
                      ? { background: cfg!.pill, color: cfg!.text }
                      : isActive
                      ? { background: '#f3f4f6', color: '#374151' }
                      : { color: '#9ca3af' }
                  }
                >
                  {!isAll && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: isActive ? cfg!.dot : '#d1d5db' }}
                    />
                  )}
                  {isAll ? 'All' : cfg!.label}
                  {count > 0 && (
                    <span
                      className="text-[10px] tabular-nums"
                      style={{ color: isActive && !isAll ? cfg!.text : '#9ca3af' }}
                    >
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
              onChange={e => { setSortField(e.target.value as keyof Candidate); setSortDir('desc'); }}
              className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 appearance-none cursor-pointer transition-all"
            >
              <option value="overallScore">Sort by Potential</option>
              <option value="name">Sort by Name</option>
              <option value="program">Sort by Program</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
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

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {COLUMNS.map(col => (
                <th
                  key={col.label}
                  onClick={col.sortable && col.field ? () => handleSort(col.field!) : undefined}
                  className={`px-6 py-3 text-left ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-gray-600 transition-colors">
                      {col.label}
                    </span>
                    {col.sortable && col.field && (
                      <ChevronsUpDown
                        className="w-3 h-3 transition-colors flex-shrink-0"
                        style={{
                          color: sortField === col.field ? '#8aaa18' : undefined,
                          transform: sortField === col.field && sortDir === 'asc' ? 'scaleY(-1)' : 'none',
                          transition: 'transform 0.15s, color 0.15s',
                        }}
                      />
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
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
              sorted.map(candidate => (
                <tr
                  key={candidate.id}
                  className="hover:bg-gray-50/70 transition-colors group"
                >
                  {/* Candidate */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={candidate.name} />
                      <span className="text-sm font-medium text-gray-900 leading-tight">
                        {candidate.name}
                      </span>
                    </div>
                  </td>

                  {/* Program */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
                      {candidate.program}
                    </span>
                  </td>

                  {/* Potential */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <ScoreBar score={candidate.overallScore} />
                  </td>

                  {/* IELTS */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    {candidate.ielts_score != null ? (
                      <span
                        className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md"
                        style={
                          candidate.ielts_score >= 6.5
                            ? { background: '#f7fde8', color: '#4d7c0f' }
                            : candidate.ielts_score >= 5.5
                            ? { background: '#fffbeb', color: '#d97706' }
                            : { background: '#fef2f2', color: '#dc2626' }
                        }
                      >
                        {typeof candidate.ielts_score === 'number'
  ? candidate.ielts_score.toFixed(1)
  : !isNaN(Number(candidate.ielts_score))
    ? Number(candidate.ielts_score).toFixed(1)
    : '—'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <StatusPill status={candidate.status} />
                  </td>

                  {/* Key factors */}
                  <td className="px-6 py-3.5 max-w-xs">
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {candidate.explanation ?? '—'}
                    </p>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <Link
                      href={`/candidate/${candidate.id}`}
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

      {/* ── Footer ── */}
      {sorted.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-[11px] text-gray-300">
            Showing {sorted.length} of {candidates.length} candidates
          </p>
          <div className="flex items-center gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const n = counts[key] ?? 0;
              if (!n) return null;
              return (
                <div key={key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                  {cfg.label} · {n}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}