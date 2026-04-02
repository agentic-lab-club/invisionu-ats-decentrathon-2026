'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, ChevronsUpDown, SlidersHorizontal,
  UserCircle2, ArrowUpDown,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';

// ================== Types ==================
interface Candidate {
  application_id: string;
  full_name: string;
  program_name: string;
  overall_score?: number;
  is_mock_potential?: boolean;
  backendReviewStage: string;   // original backend field: 'initial_screening', 'application_review', 'decision'
  backendDecision?: string;     // original backend field: 'pending', 'accepted', 'rejected'
  uiStatus: string;             // mapped UI status: 'new', 'review', 'recommended', 'rejected'
  recommendation?: string;
  ielts_score?: number;
}

interface CandidatesTableProps {
  preset?: string | null;
}

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

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildMockPotential(applicationId: string) {
  return 45 + (hashString(applicationId) % 51);
}

function buildMockIELTS(applicationId: string) {
  const base = hashString(`ielts:${applicationId}`);
  const minBand = 5.0;
  const maxBand = 8.5;
  const steps = Math.round((maxBand - minBand) / 0.5);
  return Number((minBand + (base % (steps + 1)) * 0.5).toFixed(1));
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

  // Mapping from backend review_stage to UI status
  const reviewStageMapping: Record<string, string> = {
    initial_screening: 'new',
    application_review: 'review',
    decision: 'decision',  // will be mapped further by StatusBadge based on decision
  };

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const url = new URL('/api/backend/candidates', window.location.origin);
      url.searchParams.set('program_code', '');
      url.searchParams.set('review_stage', '');
      url.searchParams.set('decision', '');
      url.searchParams.set('search', '');

      try {
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        const mapped = items.map((item: any) => {
          const backendReviewStage = item.review_stage;
          const backendDecision = item.decision;
          let uiStatus = reviewStageMapping[backendReviewStage] ?? 'new';
          // Special handling for 'decision' stage – map based on decision
          if (uiStatus === 'decision') {
            if (backendDecision === 'accepted') uiStatus = 'recommended';
            else if (backendDecision === 'rejected') uiStatus = 'rejected';
            else uiStatus = 'review'; // fallback
          }
          return {
            application_id: item.application_id,
            full_name: item.full_name,
            program_name: item.program_name,
            overall_score: item.overall_score && item.overall_score > 0
              ? item.overall_score
              : buildMockPotential(item.application_id),
            is_mock_potential: !(item.overall_score && item.overall_score > 0),
            backendReviewStage,
            backendDecision,
            uiStatus,
            recommendation: item.recommendation,
            ielts_score: item.ielts_score != null
              ? item.ielts_score
              : buildMockIELTS(item.application_id),
          };
        });
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
    filterStatus === 'all' || c.uiStatus === filterStatus
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
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    if (typeof av === 'number' && typeof bv === 'number')
      return sortDir === 'asc' ? av - bv : bv - av;
    return 0;
  });

  const counts = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.uiStatus] = (acc[c.uiStatus] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) return <TableSkeleton />;

  // Filter buttons with inline styles
  const statusFilterButtons = [
    { value: 'all', label: 'All', color: '' },
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'review', label: 'In Review', color: 'bg-amber-100 text-amber-800' },
    { value: 'interview', label: 'Interview', color: 'bg-purple-100 text-purple-800' },
    { value: 'recommended', label: 'Recommended', color: 'bg-[#b5e220]/15 text-[#6a8a10]' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-tour="candidates-table">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
            {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
            {preset && <span className="ml-1.5 text-[#4d7c0f] normal-case tracking-normal">· filtered</span>}
          </p>
          <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
            {statusFilterButtons.map(s => {
              const count = s.value === 'all' ? candidates.length : (counts[s.value] ?? 0);
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
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><div className="flex flex-col items-center gap-2"><UserCircle2 className="w-8 h-8 text-gray-200" /><p className="text-sm text-gray-400">No candidates match this filter</p><button onClick={() => setFilterStatus('all')} className="text-xs text-[#8aaa18] hover:underline mt-1">Clear filter</button></div></td></tr>
            ) : (
              sorted.map(candidate => (
                <tr key={candidate.application_id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="px-6 py-3.5 whitespace-nowrap"><div className="flex items-center gap-2.5"><Avatar name={candidate.full_name} /><span className="text-sm font-medium text-gray-900 leading-tight">{candidate.full_name}</span></div></td>
                  <td className="px-6 py-3.5 whitespace-nowrap"><span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">{candidate.program_name}</span></td>
                  <td className="px-6 py-3.5 whitespace-nowrap"><ScoreBar score={candidate.overall_score ?? 0} /></td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    {candidate.ielts_score != null ? (
                      <span className="text-xs font-semibold tabular-nums px-2 py-1 rounded-md" style={candidate.ielts_score >= 6.5 ? { background: '#f7fde8', color: '#4d7c0f' } : candidate.ielts_score >= 5.5 ? { background: '#fffbeb', color: '#d97706' } : { background: '#fef2f2', color: '#dc2626' }}>{candidate.ielts_score.toFixed(1)}</span>
                    ) : <span className="text-sm text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <StatusBadge reviewStage={candidate.backendReviewStage} decision={candidate.backendDecision} />
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <Link href={`/candidate/${candidate.application_id}`} className="inline-flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-[#8aaa18] transition-colors group-hover:text-gray-500">
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
  );
}
