'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, ChevronsUpDown, SlidersHorizontal,
  UserCircle2, ArrowUpDown,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';

// ================== Types ==================
interface Candidate {
  application_id: string;      // from backend
  full_name: string;
  program_name: string;
  overall_score?: number;      // may be absent
  review_stage: string;        // 'new', 'review', 'interview', 'recommended', 'rejected'
  decision?: string;
  recommendation?: string;     // explanation
  ielts_score?: number;
}

interface CandidatesTableProps {
  preset?: string | null;
}

// ================== Status config ==================
const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string; text: string }> = {
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

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? '#b5e220' : pct >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: cfg.pill, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const { bg, text } = avatarColor(name);
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{ background: bg, color: text }}>
      {getInitials(name)}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100"><div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" /></div>
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

// ================== Main Component ==================
export default function CandidatesTable({ preset }: CandidatesTableProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'full_name' | 'program_name' | 'overall_score'>('overall_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

useEffect(() => {
  const fetchCandidates = async () => {
    setLoading(true);
    const token = getAccessToken();
    if (!token) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    // Создаём URL и всегда добавляем параметры (даже пустые)
    const url = new URL('/api/backend/candidates', window.location.origin);
    
    // Добавляем параметры фильтрации (всегда, даже если preset пустой)
    // Если preset передан, используем его, иначе передаём пустые строки
    // (В реальности preset – это специальный фильтр, но для простоты передадим все параметры)
    url.searchParams.set('program_code', preset ? '' : '');
    url.searchParams.set('review_stage', '');
    url.searchParams.set('decision', '');
    url.searchParams.set('search', '');

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      const mapped = items.map((item: any) => ({
        application_id: item.application_id,
        full_name: item.full_name,
        program_name: item.program_name,
        overall_score: item.overall_score ?? 0,
        review_stage: item.review_stage ?? 'new',
        decision: item.decision,
        recommendation: item.recommendation,
        ielts_score: item.ielts_score,
      }));
      setCandidates(mapped);
    } catch (err) {
      console.error(err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };
  fetchCandidates();
}, [preset]);


  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = candidates.filter(c =>
    filterStatus === 'all' || c.review_stage === filterStatus
  );

const sorted = [...filtered].sort((a, b) => {
  let av: string | number;
  let bv: string | number;
  if (sortField === 'full_name') {
    av = a.full_name;
    bv = b.full_name;
  } else if (sortField === 'program_name') {
    av = a.program_name;
    bv = b.program_name;
  } else { // overall_score
    av = a.overall_score ?? 0;
    bv = b.overall_score ?? 0;
  }
  // теперь av и bv гарантированно string | number (без undefined)
  if (typeof av === 'string' && typeof bv === 'string')
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  if (typeof av === 'number' && typeof bv === 'number')
    return sortDir === 'asc' ? av - bv : bv - av;
  return 0;
});

  const counts = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.review_stage] = (acc[c.review_stage] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-tour="candidates-table">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
            {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
            {preset && <span className="ml-1.5 text-[#4d7c0f] normal-case tracking-normal">· filtered</span>}
          </p>
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
                  {!isAll && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isActive ? cfg!.dot : '#d1d5db' }} />}
                  {isAll ? 'All' : cfg!.label}
                  {count > 0 && <span className="text-[10px] tabular-nums" style={{ color: isActive && !isAll ? cfg!.text : '#9ca3af' }}>{count}</span>}
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
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" style={{ transform: sortDir === 'asc' ? 'scaleY(-1)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3 text-left cursor-pointer select-none group" onClick={() => handleSort('full_name')}>
                <div className="flex items-center gap-1"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Candidate</span><ChevronsUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer select-none group" onClick={() => handleSort('program_name')}>
                <div className="flex items-center gap-1"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Program</span><ChevronsUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer select-none group" onClick={() => handleSort('overall_score')}>
                <div className="flex items-center gap-1"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Potential</span><ChevronsUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 text-left"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">IELTS</span></th>
              <th className="px-6 py-3 text-left"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</span></th>
              <th className="px-6 py-3 text-left"><span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Key factors</span></th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-16 text-center"><div className="flex flex-col items-center gap-2"><UserCircle2 className="w-8 h-8 text-gray-200" /><p className="text-sm text-gray-400">No candidates match this filter</p><button onClick={() => setFilterStatus('all')} className="text-xs text-[#8aaa18] hover:underline mt-1">Clear filter</button></div></td></tr>
            ) : (
              sorted.map(candidate => (
                <tr key={candidate.application_id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="px-6 py-3.5 whitespace-nowrap"><div className="flex items-center gap-2.5"><Avatar name={candidate.full_name} /><span className="text-sm font-medium text-gray-900 leading-tight">{candidate.full_name}</span></div></td>
                  <td className="px-6 py-3.5 whitespace-nowrap"><span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">{candidate.program_name}</span></td>
                  <td className="px-6 py-3.5 whitespace-nowrap"><ScoreBar score={candidate.overall_score ?? 0} /></td>
                  <td className="px-6 py-3.5 whitespace-nowrap">{candidate.ielts_score != null ? <span className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md" style={candidate.ielts_score >= 6.5 ? { background: '#f7fde8', color: '#4d7c0f' } : candidate.ielts_score >= 5.5 ? { background: '#fffbeb', color: '#d97706' } : { background: '#fef2f2', color: '#dc2626' }}>{candidate.ielts_score.toFixed(1)}</span> : <span className="text-sm text-gray-300">—</span>}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap"><StatusPill status={candidate.review_stage} /></td>
                  <td className="px-6 py-3.5 max-w-xs"><p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{candidate.recommendation ?? '—'}</p></td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right"><Link href={`/candidate/${candidate.application_id}`} className="inline-flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-[#8aaa18] transition-colors group-hover:text-gray-500">Details<ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" /></Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-[11px] text-gray-300">Showing {sorted.length} of {candidates.length} candidates</p>
          <div className="flex items-center gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const n = counts[key] ?? 0;
              if (!n) return null;
              return <div key={key} className="flex items-center gap-1.5 text-[11px] text-gray-400"><span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />{cfg.label} · {n}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}