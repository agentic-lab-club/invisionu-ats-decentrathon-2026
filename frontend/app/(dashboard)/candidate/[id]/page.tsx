'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AudioLines,
  Brain,
  CheckCircle2,
  ChevronLeft,
  FileText,
  LayoutGrid,
  MessageSquareText,
  TrendingUp,
  User,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
import HumanInLoop from '@/components/candidates/HumanInLoop';
import SkillsRadar from '@/components/candidates/SkillsRadar';

interface PersonalityScores {
  axis_raw: { M: number; P: number; R: number; L: number; V: number };
  axis_max: { M: number; P: number; R: number; L: number; V: number };
  axis_norm: { M: number; P: number; R: number; L: number; V: number };
  fusion?: { M: number; P: number; R: number; L: number; V: number };
  recommendation_label?: string;
  source: string;
}

interface ScoringRun {
  id: string;
  model_name: string;
  result_json: unknown;
  recommendation: string | null;
  created_at: string;
}

interface CandidateFile {
  id: string;
  file_type: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
}

interface MockIELTSScore {
  overall: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

interface LLMScoringResult {
  workflow_status?: string;
  stt_length?: number;
  aggregated_metrics?: Record<string, number>;
  global_score?: Record<string, number>;
  candidate_breakdown?: Record<string, string>;
  llm_evaluations?: Record<string, unknown>;
}

interface CandidateDetail {
  application_id: string;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  program_name: string;
  review_stage: string;
  decision: string;
  video_transcript?: string | null;
  screening_error: string | null;
  files: CandidateFile[];
  latest_scoring_run: ScoringRun | null;
  latest_personality_scoring_run: ScoringRun | null;
  latest_llm_scoring_run: ScoringRun | null;
}

const AXIS_META: Record<string, { label: string; description: string }> = {
  M: { label: 'Mission', description: 'Intrinsic motivation and meaning-driven orientation' },
  P: { label: 'Precision', description: 'Structured thinking, planning and execution quality' },
  R: { label: 'Resilience', description: 'Persistence under pressure and adaptive response' },
  L: { label: 'Leadership', description: 'Initiative, influence and team coordination' },
  V: { label: 'Values', description: 'Ethical stance, fairness and principled behaviour' },
};

const RECOMMENDATION_META: Record<string, { label: string; color: string; bg: string }> = {
  strong_recommend: { label: 'Strong Recommend', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  recommend: { label: 'Recommend', color: 'text-[#6a8a10]', bg: 'bg-[#b5e220]/10 border-[#b5e220]/20' },
  consider: { label: 'Consider', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
  not_recommend: { label: 'Not Recommended', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
};

const FILE_TYPE_META: Record<string, { label: string; description: string }> = {
  video_presentation: { label: 'Video presentation', description: 'Recorded candidate introduction' },
  video_audio: { label: 'Extracted audio', description: 'Audio derived from the candidate video' },
  portfolio: { label: 'Portfolio', description: 'Portfolio or supporting work sample' },
  certificate: { label: 'Certificate', description: 'Academic or extracurricular certificate' },
  english_result: { label: 'English results', description: 'IELTS, TOEFL, Duolingo, or similar' },
};

function isPersonalityScores(value: unknown): value is PersonalityScores {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'axis_norm' in value &&
    'axis_raw' in value &&
    'axis_max' in value
  );
}

function isLLMScoringResult(value: unknown): value is LLMScoringResult {
  return Boolean(
    value &&
    typeof value === 'object' &&
    ('aggregated_metrics' in value || 'global_score' in value || 'workflow_status' in value)
  );
}

function hasMeaningfulPersonalityScores(value: PersonalityScores | null): value is PersonalityScores {
  if (!value) return false;

  return Object.values(value.axis_norm).some((score) => score > 0) || Object.values(value.axis_raw).some((score) => score > 0);
}

function parseScoringPayload(raw: unknown): unknown {
  if (!raw) return null;

  try {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(atob(raw));
      } catch {
        return JSON.parse(raw);
      }
    }

    return raw;
  } catch (error) {
    console.error('Failed to parse scoring result_json:', error);
    return null;
  }
}

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

function axisColor(norm: number) {
  if (norm >= 70) return { bar: '#b5e220', text: 'text-[#6a8a10]' };
  if (norm >= 45) return { bar: '#fbbf24', text: 'text-amber-600' };
  return { bar: '#f87171', text: 'text-red-500' };
}

function buildRadarData(norm: PersonalityScores['axis_norm']): Record<string, number> {
  return Object.fromEntries(
    Object.entries(norm).map(([key, value]) => [AXIS_META[key]?.label ?? key, Math.round(value)])
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedMetric(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function normalizedFromFivePointScale(value: number) {
  return clamp((value / 3) * 100, 0, 100);
}

function derivePersonalityScoresFromLLM(result: LLMScoringResult | null): PersonalityScores | null {
  if (!result) return null;

  const metrics = result.aggregated_metrics ?? {};
  const leadership = typeof metrics.Leadership === 'number' ? metrics.Leadership : undefined;
  const mission = typeof metrics.Motivation === 'number' ? metrics.Motivation : undefined;
  const precision = typeof metrics.Planning === 'number' ? metrics.Planning : undefined;
  const resilience = typeof metrics.Resilience === 'number' ? metrics.Resilience : undefined;
  const values = typeof metrics.Values === 'number' ? metrics.Values : undefined;

  if ([leadership, mission, precision, resilience, values].every((value) => value === undefined)) {
    return null;
  }

  const raw = {
    L: roundedMetric(leadership ?? 0),
    M: roundedMetric(mission ?? 0),
    P: roundedMetric(precision ?? 0),
    R: roundedMetric(resilience ?? 0),
    V: roundedMetric(values ?? 0),
  };

  const axisMax = { L: 3, M: 3, P: 3, R: 3, V: 3 };

  return {
    source: 'llm_fallback',
    recommendation_label: undefined,
    axis_raw: raw,
    axis_max: axisMax,
    axis_norm: {
      L: normalizedFromFivePointScale(raw.L),
      M: normalizedFromFivePointScale(raw.M),
      P: normalizedFromFivePointScale(raw.P),
      R: normalizedFromFivePointScale(raw.R),
      V: normalizedFromFivePointScale(raw.V),
    },
    fusion: {
      L: normalizedFromFivePointScale(raw.L),
      M: normalizedFromFivePointScale(raw.M),
      P: normalizedFromFivePointScale(raw.P),
      R: normalizedFromFivePointScale(raw.R),
      V: normalizedFromFivePointScale(raw.V),
    },
  };
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function toHalfBand(seed: number, minBand: number, maxBand: number) {
  const steps = Math.round((maxBand - minBand) / 0.5);
  return Number((minBand + (seed % (steps + 1)) * 0.5).toFixed(1));
}

function buildMockIELTSScore(candidateId: string): MockIELTSScore {
  const base = hashString(candidateId);
  const listening = toHalfBand(base, 5.5, 9.0);
  const reading = toHalfBand(base >> 3, 5.0, 8.5);
  const writing = toHalfBand(base >> 7, 5.0, 8.0);
  const speaking = toHalfBand(base >> 11, 5.5, 8.5);
  const overall = Number((((listening + reading + writing + speaking) / 4) * 2).toFixed(0)) / 2;

  return { overall, listening, reading, writing, speaking };
}

function pickPersonalityRun(candidate: CandidateDetail): ScoringRun | null {
  if (candidate.latest_personality_scoring_run) return candidate.latest_personality_scoring_run;
  if (candidate.latest_scoring_run?.model_name === 'personality_test') return candidate.latest_scoring_run;
  return null;
}

function pickLLMRun(candidate: CandidateDetail): ScoringRun | null {
  if (candidate.latest_llm_scoring_run) return candidate.latest_llm_scoring_run;
  if (candidate.latest_scoring_run?.model_name === 'llmscoring') return candidate.latest_scoring_run;
  return null;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.min(100, Math.max(0, score));
  const dash = (bounded / 100) * circumference;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#b5e220"
          strokeWidth="5"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-base font-semibold text-gray-800 tabular-nums">{Math.round(score)}</span>
    </div>
  );
}

function AxisCard({
  axis,
  raw,
  max,
  norm,
  fusion,
}: {
  axis: string;
  raw: number;
  max: number;
  norm: number;
  fusion?: number;
}) {
  const meta = AXIS_META[axis];
  const color = axisColor(norm);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{meta.description}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold tabular-nums ${color.text}`}>
            {Math.round(norm)}
            <span className="text-xs font-normal text-gray-400">%</span>
          </span>
          {fusion !== undefined && (
            <p className="mt-0.5 text-[10px] text-gray-400">
              fusion: <span className="font-semibold text-gray-600">{fusion.toFixed(1)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${norm}%`, background: color.bar }} />
      </div>

      {fusion !== undefined && (
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-gray-50">
          <div
            className="h-full rounded-full opacity-60 transition-all duration-500"
            style={{ width: `${Math.min(100, fusion)}%`, background: color.bar }}
          />
        </div>
      )}

      <p className="text-[10px] text-gray-400 tabular-nums">
        {raw} / {max} raw points
      </p>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{title}</p>
      <p className="mt-1 text-sm text-gray-700">{value}</p>
    </div>
  );
}

export default function CandidatePage() {
  const params = useParams();
  const id = params.id as string;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingAssetId, setOpeningAssetId] = useState<string | null>(null);

  const fetchCandidate = async () => {
    const token = getAccessToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/backend/candidates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        setError('Candidate not found');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch candidate');
      }

      const data: CandidateDetail = await response.json();

      setCandidate({
        ...data,
        files: data.files ?? [],
        latest_scoring_run: data.latest_scoring_run
          ? { ...data.latest_scoring_run, result_json: parseScoringPayload(data.latest_scoring_run.result_json) }
          : null,
        latest_personality_scoring_run: data.latest_personality_scoring_run
          ? {
              ...data.latest_personality_scoring_run,
              result_json: parseScoringPayload(data.latest_personality_scoring_run.result_json),
            }
          : null,
        latest_llm_scoring_run: data.latest_llm_scoring_run
          ? { ...data.latest_llm_scoring_run, result_json: parseScoringPayload(data.latest_llm_scoring_run.result_json) }
          : null,
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCandidate();
    }
  }, [id]);

  const personalityRun = candidate ? pickPersonalityRun(candidate) : null;
  const llmRun = candidate ? pickLLMRun(candidate) : null;

  const llmScores = isLLMScoringResult(llmRun?.result_json) ? llmRun.result_json : null;
  const nativeScores = isPersonalityScores(personalityRun?.result_json) ? personalityRun.result_json : null;
  const usesLLMFallback = !hasMeaningfulPersonalityScores(nativeScores) && Boolean(derivePersonalityScoresFromLLM(llmScores));

  const scores = useMemo(() => {
    if (hasMeaningfulPersonalityScores(nativeScores)) return nativeScores;
    return derivePersonalityScoresFromLLM(llmScores);
  }, [llmScores, nativeScores]);

  const overallScore = useMemo(() => {
    if (!scores) return 0;
    return Math.round(Object.values(scores.axis_norm).reduce((sum, value) => sum + value, 0) / 5);
  }, [scores]);

  const radarData = useMemo(() => (scores ? buildRadarData(scores.axis_norm) : {}), [scores]);
  const primaryVideoFile = useMemo(
    () => candidate?.files?.find((file) => file.file_type === 'video') ?? null,
    [candidate?.files]
  );
  const audioFile = useMemo(
    () => candidate?.files?.find((file) => file.file_type === 'video_audio') ?? null,
    [candidate?.files]
  );
  const englishResultFile = useMemo(
    () => candidate?.files?.find((file) => file.file_type === 'english_result') ?? null,
    [candidate?.files]
  );
  const mockIELTSScore = useMemo(
    () => (candidate ? buildMockIELTSScore(candidate.application_id) : null),
    [candidate]
  );

  const openAsset = async (file: CandidateFile) => {
    const token = getAccessToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      setOpeningAssetId(file.id);

      const response = await fetch(`/api/backend/assets/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to open ${file.file_type}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (assetError) {
      console.error(assetError);
      setError('Failed to open candidate file');
    } finally {
      setOpeningAssetId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b5e220] border-t-transparent" />
        <p className="ml-3 text-sm text-gray-400">Loading candidate…</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex items-center justify-center py-24 text-center">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{error || 'Candidate not found.'}</p>
          <Link href="/" className="text-xs text-[#8aaa18] hover:underline">
            ← Back to candidates
          </Link>
        </div>
      </div>
    );
  }

  const uiStatus = getUIStatus(candidate.review_stage, candidate.decision);
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Unnamed candidate';

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600">
        <ChevronLeft className="h-3.5 w-3.5" />
        Candidates
      </Link>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#b5e220]/15">
            <User className="h-5 w-5 text-[#8aaa18]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold leading-tight text-gray-900">{fullName}</h1>
              <StatusBadge reviewStage={candidate.review_stage} decision={candidate.decision} />
            </div>
            <p className="text-sm text-gray-400">{candidate.program_name}</p>
          </div>

          {scores && (
            <div className="flex flex-shrink-0 flex-col items-center gap-1">
              <ScoreRing score={overallScore} />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Potential</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {candidate.email && <InfoCard title="Email" value={candidate.email} />}
          {candidate.phone_number && <InfoCard title="Phone" value={candidate.phone_number} />}
          <InfoCard title="Review Stage" value={formatLabel(candidate.review_stage)} />
          <InfoCard title="Decision" value={formatLabel(candidate.decision)} />
        </div>

        {scores && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            {Object.entries(scores.axis_norm).map(([axis, norm]) => {
              const color = axisColor(norm);
              return (
                <div key={axis} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200">
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
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rec.bg}`}>
            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${rec.color}`} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">AI Recommendation</p>
              <p className={`text-sm font-semibold ${rec.color}`}>{rec.label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-gray-400">Balanced Leader score</p>
              <p className="text-sm font-semibold text-gray-700 tabular-nums">
                {(() => {
                  const fusion = scores.fusion;
                  if (!fusion) return '—';
                  return (0.15 * fusion.M + 0.15 * fusion.P + 0.2 * fusion.R + 0.35 * fusion.L + 0.15 * fusion.V).toFixed(1);
                })()}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {scores && Object.keys(radarData).length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <TrendingUp className="h-3.5 w-3.5 text-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Skills profile</p>
              </div>
              <div className="p-4">
                <SkillsRadar data={radarData} />
              </div>
            </div>
          )}

          {!scores && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-400">
              Personality scoring is not available for this candidate yet.
            </div>
          )}

          <HumanInLoop candidateId={candidate.application_id} initialStatus={uiStatus} onStatusUpdate={fetchCandidate} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 px-1">
            <LayoutGrid className="h-3.5 w-3.5 text-gray-300" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Personality assessment</p>
          </div>

          {usesLLMFallback && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Personality scores are currently inferred from the video/audio AI analysis because the direct personality payload is missing or empty.
            </div>
          )}

          {(primaryVideoFile || audioFile) && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Candidate media</p>

                {primaryVideoFile && (
                  <button
                    type="button"
                    onClick={() => openAsset(primaryVideoFile)}
                    disabled={openingAssetId === primaryVideoFile.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-[#b5e220]/50 hover:bg-[#b5e220]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4 text-gray-400" />
                    {openingAssetId === primaryVideoFile.id ? 'Opening video…' : 'Open video'}
                  </button>
                )}

                {audioFile && (
                  <button
                    type="button"
                    onClick={() => openAsset(audioFile)}
                    disabled={openingAssetId === audioFile.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-[#b5e220]/50 hover:bg-[#b5e220]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AudioLines className="h-4 w-4 text-gray-400" />
                    {openingAssetId === audioFile.id ? 'Opening audio…' : 'Open extracted audio'}
                  </button>
                )}
              </div>
            </div>
          )}

          {candidate.files.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <FileText className="h-3.5 w-3.5 text-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Uploaded documents</p>
              </div>

              <div className="space-y-3 p-5">
                {candidate.files.map((file) => {
                  const meta = FILE_TYPE_META[file.file_type] ?? {
                    label: formatLabel(file.file_type),
                    description: 'Uploaded application file',
                  };

                  return (
                    <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{file.original_filename}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {meta.description} · {formatBytes(file.size_bytes)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openAsset(file)}
                        disabled={openingAssetId === file.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-[#b5e220]/50 hover:bg-[#b5e220]/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        {openingAssetId === file.id ? 'Opening…' : 'Open file'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!englishResultFile && mockIELTSScore && (
            <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-6 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">IELTS score</p>
                  <p className="mt-1 text-sm text-blue-900">Frontend-generated fallback for this candidate</p>
                </div>
                <div className="rounded-full border border-blue-200 bg-white px-3 py-1 text-sm font-semibold text-blue-700">
                  Overall {mockIELTSScore.overall}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                {[
                  ['Listening', mockIELTSScore.listening],
                  ['Reading', mockIELTSScore.reading],
                  ['Writing', mockIELTSScore.writing],
                  ['Speaking', mockIELTSScore.speaking],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-blue-900 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scores ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Object.entries(scores.axis_norm).map(([axis, norm]) => (
                <AxisCard
                  key={axis}
                  axis={axis}
                  raw={scores.axis_raw[axis as keyof typeof scores.axis_raw]}
                  max={scores.axis_max[axis as keyof typeof scores.axis_max]}
                  norm={norm}
                  fusion={scores.fusion?.[axis as keyof typeof scores.fusion]}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
              No personality scoring data available yet.
            </div>
          )}

          {llmScores && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <Brain className="h-3.5 w-3.5 text-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Video / Audio AI Analysis</p>
              </div>

              <div className="space-y-5 p-5">
                {llmScores.global_score && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(llmScores.global_score).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{formatLabel(key)}</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {llmScores.aggregated_metrics && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Aggregated metrics</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.entries(llmScores.aggregated_metrics).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-600">{formatLabel(key)}</span>
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {llmScores.stt_length !== undefined && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MessageSquareText className="h-3.5 w-3.5 text-gray-300" />
                    Transcript length:
                    <span className="font-semibold text-gray-700">{llmScores.stt_length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {candidate.video_transcript && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <FileText className="h-3.5 w-3.5 text-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Transcript</p>
              </div>
              <div className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">{candidate.video_transcript}</p>
              </div>
            </div>
          )}

          {candidate.screening_error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {candidate.screening_error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
