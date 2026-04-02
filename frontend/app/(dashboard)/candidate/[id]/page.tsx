'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, User, TrendingUp, LayoutGrid, Brain, CheckCircle2 } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import HumanInLoop from '@/components/candidates/HumanInLoop';
import SkillsRadar from '@/components/candidates/SkillsRadar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalityScores {
  axis_raw:  { M: number; P: number; R: number; L: number; V: number };
  axis_max:  { M: number; P: number; R: number; L: number; V: number };
  axis_norm: { M: number; P: number; R: number; L: number; V: number };
  fusion?:   { M: number; P: number; R: number; L: number; V: number };
  recommendation_label?: string;
  source:    string;
}

interface ScoringRun {
  id:             string;
  model_name:     string;
  result_json:    PersonalityScores | null; 
  recommendation: string | null;
  created_at:     string;
}

interface CandidateDetail {
  application_id: string;
  first_name:     string;
  last_name:      string;
  program_name:   string;
  review_stage:   string;
  decision:       string;
  screening_error: string | null;
  latest_scoring_run: ScoringRun | null;
}

// ── Axis metadata ─────────────────────────────────────────────────────────────

const AXIS_META: Record<string, { label: string; description: string }> = {
  M: { label: 'Mission',     description: 'Intrinsic motivation and meaning-driven orientation' },
  P: { label: 'Precision',   description: 'Structured thinking, planning and execution quality' },
  R: { label: 'Resilience',  description: 'Persistence under pressure and adaptive response' },
  L: { label: 'Leadership',  description: 'Initiative, influence and team coordination' },
  V: { label: 'Values',      description: 'Ethical stance, fairness and principled behaviour' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUIStatus(reviewStage: string, decision?: string): string {
  if (reviewStage === 'initial_screening')  return 'new';
  if (reviewStage === 'application_review') return 'review';
  if (reviewStage === 'decision') {
    if (decision === 'accepted') return 'recommended';
    if (decision === 'rejected') return 'rejected';
    return 'review';
  }
  return 'new';
}

function axisColor(norm: number) {
  if (norm >= 70) return { bar: '#b5e220', text: 'text-[#6a8a10]' };
  if (norm >= 45) return { bar: '#fbbf24', text: 'text-amber-600' };
  return { bar: '#f87171', text: 'text-red-500' };
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, score));
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
      <span className="absolute text-base font-semibold text-gray-800 tabular-nums">
        {Math.round(score)}
      </span>
    </div>
  );
}

// ── Personality axis card ─────────────────────────────────────────────────────
function AxisCard({ axis, raw, max, norm, fusion }: {
  axis: string; raw: number; max: number; norm: number; fusion?: number;
}) {
  const meta  = AXIS_META[axis];
  const color = axisColor(norm);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{meta.description}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold tabular-nums ${color.text}`}>
            {Math.round(norm)}
            <span className="text-xs font-normal text-gray-400">%</span>
          </span>
          {fusion !== undefined && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              fusion: <span className="font-semibold text-gray-600">{fusion.toFixed(1)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${norm}%`, background: color.bar }}
        />
      </div>

      {fusion !== undefined && (
        <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500 opacity-60"
            style={{ width: `${Math.min(100, fusion / 0.55 * 1)}%`, background: color.bar }}
          />
        </div>
      )}

      <p className="text-[10px] text-gray-400 tabular-nums">
        {raw} / {max} raw points
      </p>
    </div>
  );
}


// recommendation badge
const RECOMMENDATION_META: Record<string, { label: string; color: string; bg: string }> = {
  strong_recommend: { label: 'Strong Recommend', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  recommend:        { label: 'Recommend',        color: 'text-[#6a8a10]',   bg: 'bg-[#b5e220]/10 border-[#b5e220]/20' },
  consider:         { label: 'Consider',         color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
  not_recommend:    { label: 'Not Recommended',  color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
};



// ── Radar adapter ─────────────────────────────────────────────────────────────
// SkillsRadar expects Record<string, number> — we pass axis_norm with full labels

function buildRadarData(norm: PersonalityScores['axis_norm']): Record<string, number> {
  return Object.fromEntries(
    Object.entries(norm).map(([k, v]) => [AXIS_META[k]?.label ?? k, Math.round(v)])
  );
}



// ── Main page ─────────────────────────────────────────────────────────────────

export default function CandidatePage() {
  const params = useParams();
  const id     = params.id as string;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

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

    if (!res.ok) throw new Error('Failed to fetch candidate');

    const data: CandidateDetail = await res.json();

    // ✅ Парсинг result_json
    const raw = data.latest_scoring_run?.result_json;
    let parsedScores: PersonalityScores | null = null;

    if (raw) {
      try {
        const parsed = typeof raw === 'string'
          ? (() => {
              try {
                return JSON.parse(atob(raw)); // base64
              } catch {
                return JSON.parse(raw);       // обычный JSON
              }
            })()
          : raw;

        if (parsed?.axis_norm && parsed?.axis_raw && parsed?.axis_max) {
          parsedScores = parsed as PersonalityScores;
        }
      } catch (e) {
        console.error('Failed to parse result_json:', e);
      }
    }

    setCandidate({
      ...data,
      latest_scoring_run: data.latest_scoring_run
        ? { ...data.latest_scoring_run, result_json: parsedScores }
        : null,
    });

  } catch (err) {
    setError('Failed to load candidate');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { if (id) fetchCandidate(); }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 ml-3">Loading candidate…</p>
    </div>
  );

  if (error || !candidate) return (
    <div className="flex items-center justify-center py-24 text-center">
      <div className="space-y-2">
        <p className="text-sm text-gray-500">{error || 'Candidate not found.'}</p>
        <Link href="/" className="text-xs text-[#8aaa18] hover:underline">← Back to candidates</Link>
      </div>
    </div>
  );

  const scores   = candidate.latest_scoring_run?.result_json;
  const uiStatus = getUIStatus(candidate.review_stage, candidate.decision);

  // Overall score = average of axis_norm values
  const overallScore = scores
    ? Math.round(Object.values(scores.axis_norm).reduce((s, v) => s + v, 0) / 5)
    : 0;

  const radarData = scores ? buildRadarData(scores.axis_norm) : {};

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Candidates
      </Link>

      {/* ── Header card ── */}
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

          {scores && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <ScoreRing score={overallScore} />
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Potential</p>
            </div>
          )}
        </div>

        {/* Axis pill row */}
        {scores && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
            {Object.entries(scores.axis_norm).map(([axis, norm]) => {
              const color = axisColor(norm);
              return (
                <div key={axis} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${norm}%`, background: color.bar }} />
                  </div>
                  <span className="text-xs text-gray-500">{AXIS_META[axis]?.label ?? axis}</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{Math.round(norm)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
{scores?.recommendation_label && (() => {
  const rec = RECOMMENDATION_META[scores.recommendation_label] ?? {
    label: scores.recommendation_label,
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-100',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${rec.bg}`}>
      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${rec.color}`} />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
          AI Recommendation
        </p>
        <p className={`text-sm font-semibold ${rec.color}`}>{rec.label}</p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-[10px] text-gray-400">Balanced Leader score</p>
        <p className="text-sm font-semibold text-gray-700 tabular-nums">
          {(() => {
            const f = scores.fusion;
            if (!f) return '—';
            return (0.15*f.M + 0.15*f.P + 0.20*f.R + 0.35*f.L + 0.15*f.V).toFixed(1);
          })()}
        </p>
      </div>
    </div>
  );
})()}
      {/* ── Body grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Radar */}
          {scores && Object.keys(radarData).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Skills profile</p>
              </div>
              <div className="p-4">
                <SkillsRadar data={radarData} />
              </div>
            </div>
          )}

          <HumanInLoop
            candidateId={candidate.application_id}
            initialStatus={uiStatus}
            onStatusUpdate={fetchCandidate}
          />
        </div>

        {/* Right column */}
{/* Right column */}
<div className="lg:col-span-2 space-y-4">
  <div className="flex items-center gap-2 px-1">
    <LayoutGrid className="w-3.5 h-3.5 text-gray-300" />
    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
      Personality assessment
    </p>
  </div>

  {scores ? (
    Object.entries(scores.axis_norm).map(([axis, norm]) => (
      <AxisCard
        key={axis}
        axis={axis}
        raw={scores.axis_raw[axis as keyof typeof scores.axis_raw]}
        max={scores.axis_max[axis as keyof typeof scores.axis_max]}
        norm={norm}
        fusion={scores.fusion?.[axis as keyof typeof scores.fusion]}  // ← только здесь
      />
    ))
  ) : (
    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
      No scoring data available yet.
    </div>
  )}

          {/* Screening error */}
          {candidate.screening_error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              {candidate.screening_error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}