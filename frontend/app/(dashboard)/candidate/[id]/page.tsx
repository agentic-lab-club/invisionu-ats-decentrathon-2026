// app/(dashboard)/candidate/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CategorySection from '@/components/candidates/CategorySection';
import SkillsRadar from '@/components/candidates/SkillsRadar';
import HumanInLoop from '@/components/candidates/HumanInLoop';
import { ChevronLeft, User, TrendingUp, LayoutGrid } from 'lucide-react';
import MLAnalysisPanel from '@/components/candidates/MLAnalysisPanel';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';

// Интерфейс для данных из бэкенда (храним в состоянии)
interface Candidate {
  application_id: string;
  first_name: string;
  last_name: string;
  program_name: string;
  overall_score?: number;
  review_stage: string;      // original from backend
  decision?: string;
  recommendation?: string;
  subscores: Record<string, number>;
  evidence: Record<string, string>;
  video_transcript?: string;
  files?: any[];
  screening_error?: string;
  latest_scoring_run?: any;
}

// Вспомогательная функция для получения UI-статуса (для HumanInLoop)
function getUIStatus(reviewStage: string, decision?: string): string {
  if (reviewStage === 'initial_screening') return 'new';
  if (reviewStage === 'application_review') return 'review';
  if (reviewStage === 'decision') {
    if (decision === 'accepted') return 'recommended';
    if (decision === 'rejected') return 'rejected';
    return 'review';
  }
  return 'new';
}

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
  const [error, setError] = useState('');

  const fetchCandidate = async () => {
    const token = getAccessToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/backend/candidates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setError('Candidate not found');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const overallScore = data.latest_scoring_run?.result_json?.overall_score ?? 0;
      const subscores = data.latest_scoring_run?.result_json?.subscores ?? {};
      const evidence = data.latest_scoring_run?.result_json?.evidence ?? {};

      setCandidate({
        application_id: data.application_id,
        first_name: data.first_name,
        last_name: data.last_name,
        program_name: data.program_name,
        overall_score: overallScore,
        review_stage: data.review_stage,
        decision: data.decision,
        recommendation: data.latest_scoring_run?.recommendation,
        subscores,
        evidence,
        video_transcript: data.video_transcript,
        files: data.files,
        screening_error: data.screening_error,
        latest_scoring_run: data.latest_scoring_run,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCandidate();
  }, [id]);

  const handleStatusUpdate = (newStatus: string) => {
    // Обновляем локальное состояние кандидата после успешного PATCH
    // Для этого нужно преобразовать UI-статус обратно в review_stage и decision
    // Но проще перезагрузить данные с сервера
    fetchCandidate();
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

  if (error || !candidate) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">{error || 'Candidate not found.'}</p>
          <Link href="/" className="text-xs text-[#8aaa18] hover:underline">← Back to candidates</Link>
        </div>
      </div>
    );
  }

  const categories = Object.keys(candidate.subscores);
  const uiStatus = getUIStatus(candidate.review_stage, candidate.decision);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Candidates
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#b5e220]/15 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#8aaa18]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                {candidate.first_name} {candidate.last_name}
              </h1>
              <StatusBadge reviewStage={candidate.review_stage} decision={candidate.decision} />
            </div>
            <p className="text-sm text-gray-400">{candidate.program_name}</p>
          </div>

          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ScoreRing score={candidate.overall_score ?? 0} />
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Potential</p>
          </div>
        </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Skills profile</p>
            </div>
            <div className="p-4">
              <SkillsRadar data={candidate.subscores} />
            </div>
          </div>

          <HumanInLoop
            candidateId={candidate.application_id}
            initialStatus={uiStatus}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

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

          <MLAnalysisPanel analysis={candidate.latest_scoring_run?.result_json} />
        </div>
      </div>
    </div>
  );
}