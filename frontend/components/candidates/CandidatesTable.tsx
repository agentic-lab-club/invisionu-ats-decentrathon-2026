'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronsUpDown, SlidersHorizontal } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  program: string;
  overallScore: number;
  status: 'new' | 'review' | 'interview' | 'recommended' | 'rejected';
  explanation?: string;
  ielts_score?: number;
}

const STATUS_CONFIG = {
  new:         { label: 'New',         className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  review:      { label: 'In Review',   className: 'bg-amber-50 text-amber-600 border border-amber-100' },
  interview:   { label: 'Interview',   className: 'bg-violet-50 text-violet-600 border border-violet-100' },
  recommended: { label: 'Recommended', className: 'bg-[#b5e220]/15 text-[#6a8a10] border border-[#b5e220]/30' },
  rejected:    { label: 'Rejected',    className: 'bg-red-50 text-red-500 border border-red-100' },
};

function ScoreDot({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? '#b5e220' : pct >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm text-gray-700 tabular-nums">{score}</span>
    </div>
  );
}

export default function CandidatesTable() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Candidate>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetch('/api/candidates')
      .then(res => res.json())
      .then(data => { setCandidates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSort = (field: keyof Candidate) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const sorted = [...candidates]
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDirection === 'asc' ? av - bv : bv - av;
      return 0;
    });

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading candidates…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
          {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-300" />
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="review">In Review</option>
              <option value="interview">Interview</option>
              <option value="recommended">Recommended</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                { field: 'name',         label: 'Name' },
                { field: 'program',      label: 'Program' },
                { field: 'overallScore', label: 'Potential' },
                { field: null,           label: 'IELTS' },
                { field: null,           label: 'Status' },
                { field: null,           label: 'Key factors' },
              ].map(({ field, label }) => (
                <th
                  key={label}
                  onClick={field ? () => handleSort(field as keyof Candidate) : undefined}
                  className={`px-6 py-3 text-left ${field ? 'cursor-pointer select-none group' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-gray-600 transition-colors">
                      {label}
                    </span>
                    {field && (
                      <ChevronsUpDown className={`w-3 h-3 transition-colors ${sortField === field ? 'text-[#8aaa18]' : 'text-gray-300 group-hover:text-gray-400'}`} />
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-right">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                  No candidates found
                </td>
              </tr>
            ) : sorted.map(candidate => (
              <tr key={candidate.id} className="hover:bg-gray-50/60 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{candidate.program}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ScoreDot score={candidate.overallScore} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500 tabular-nums">
                    {candidate.ielts_score ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_CONFIG[candidate.status].className}`}>
                    {STATUS_CONFIG[candidate.status].label}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {candidate.explanation || '—'}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Link
                    href={`/candidate/${candidate.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors group-hover:text-[#8aaa18]"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}