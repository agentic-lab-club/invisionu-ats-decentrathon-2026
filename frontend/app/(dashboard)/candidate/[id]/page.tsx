// app/(dashboard)/candidate/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CategorySection from '@/components/candidates/CategorySection';
import SkillsRadar from '@/components/candidates/SkillsRadar';
import HumanInLoop from '@/components/candidates/HumanInLoop';
import { ChevronLeft, User, TrendingUp, LayoutGrid } from 'lucide-react';
import MLAnalysisPanel, { MOCK_ML_ANALYSIS } from '@/components/candidates/MLAnalysisPanel';

interface Candidate {
  id: string;
  name: string;
  position: string;
  overallScore: number;
  subscores: Record<string, number>;
  evidence: Record<string, string>;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'New',         className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  review:      { label: 'In Review',   className: 'bg-amber-50 text-amber-600 border border-amber-100' },
  interview:   { label: 'Interview',   className: 'bg-violet-50 text-violet-600 border border-violet-100' },
  recommended: { label: 'Recommended', className: 'bg-[#b5e220]/15 text-[#6a8a10] border border-[#b5e220]/30' },
  rejected:    { label: 'Rejected',    className: 'bg-red-50 text-red-500 border border-red-100' },
};

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke="#b5e220" strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-base font-semibold text-gray-800 tabular-nums">{score}</span>
    </div>
  );
}

export default function CandidatePage() {
  const params = useParams();
  const id = params.id as string;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/candidates/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setCandidate(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = (newStatus: string) => {
    if (candidate) setCandidate({ ...candidate, status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading candidate…</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Candidate not found.</p>
          <Link href="/" className="text-xs text-[#8aaa18] hover:underline">← Back to candidates</Link>
        </div>
      </div>
    );
  }

  const categories = Object.keys(candidate.subscores);
  const statusCfg = STATUS_CONFIG[candidate.status];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Candidates
      </Link>

      {/* Hero card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-[#b5e220]/15 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#8aaa18]" />
          </div>

          {/* Name + position + status */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">{candidate.name}</h1>
              {statusCfg && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{candidate.position}</p>
          </div>

          {/* Score ring */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ScoreRing score={candidate.overallScore} />
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Potential</p>
          </div>
        </div>

        {/* Subscore pills */}
        {categories.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
            {categories.map(cat => {
              const val = candidate.subscores[cat];
              const color = val >= 75 ? '#b5e220' : val >= 50 ? '#fbbf24' : '#f87171';
              return (
                <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                  </div>
                  <span className="text-xs text-gray-500">{cat}</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{val}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Skills radar */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Skills profile</p>
            </div>
            <div className="p-4">
              <SkillsRadar data={candidate.subscores} />
            </div>
          </div>

          {/* Human-in-loop */}
          <HumanInLoop
            candidateId={candidate.id}
            initialStatus={candidate.status}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <LayoutGrid className="w-3.5 h-3.5 text-gray-300" />
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
              Assessment details
            </p>
          </div>
          {categories.map(cat => (
            <CategorySection
              key={cat}
              category={cat}
              score={candidate.subscores[cat]}
              evidence={candidate.evidence[cat] || 'No data'}
            />
          ))}
                    {/* ML Analysis */}
          <MLAnalysisPanel analysis={MOCK_ML_ANALYSIS} />

        </div>
      </div>
    </div>
  );
}