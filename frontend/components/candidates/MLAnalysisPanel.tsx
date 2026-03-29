'use client';

import { useState } from 'react';
import {
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Brain, Target, Users, AlignLeft, Quote, TrendingDown,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Subscore { [key: string]: number; }

interface Evidence {
  subscore: string;
  quote: string;
  reason: string;
}

interface CategoryAnalysis {
  subscores: Subscore;
  evidence: Evidence[];
  weaknesses: string[];
}

interface MLAnswer {
  motivation: CategoryAnalysis;
  leadership_potential: CategoryAnalysis;
  response_structure: CategoryAnalysis;
  context_notes: Record<string, string>;
  risk_flags: string[];
  missing_evidence: string[];
}

interface MLAnalysis {
  answer: MLAnswer;
  model: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────
export const MOCK_ML_ANALYSIS: MLAnalysis = {
  answer: {
    motivation: {
      subscores: {
        university_specificity: 2,
        program_fit: 2,
        goal_alignment: 2,
        intrinsic_motivation: 1,
        specificity_of_reasoning: 1,
      },
      evidence: [
        {
          subscore: 'university_specificity',
          quote: 'I think it is a good university and it gives many opportunities... I heard that this university is modern and focuses on technology, which is important in today\'s world.',
          reason: 'Provides only generic praise and a broad statement about modern focus; lacks concrete details about inVision U.',
        },
        {
          subscore: 'program_fit',
          quote: 'I am interested in IT program because IT is popular and перспективное направление. I like computers and I want to work in this field in the future.',
          reason: 'Shows general interest in IT but does not connect personal background or specific skills to the program.',
        },
        {
          subscore: 'goal_alignment',
          quote: 'My long-term goal is to have a successful career and work in a good company... This program will help me because it gives knowledge and skills.',
          reason: 'States a generic career goal and a vague link to the program without concrete alignment.',
        },
        {
          subscore: 'intrinsic_motivation',
          quote: 'I want to develop myself and get a good education. I want to earn money and help my family.',
          reason: 'Motivation is expressed mainly in terms of external outcomes with little evidence of internal drive or values.',
        },
        {
          subscore: 'specificity_of_reasoning',
          quote: 'I think it is a good university... IT is popular... This program will help me because it gives knowledge and skills.',
          reason: 'Reasoning is generic and lacks concrete, detailed justification.',
        },
      ],
      weaknesses: [
        'Very generic reasons for choosing inVision U and the IT program.',
        'Limited articulation of personal values or deep internal motivation.',
        'Lack of concrete examples linking program content to long-term career plan.',
      ],
    },
    leadership_potential: {
      subscores: {
        leadership_definition_quality: 1,
        concrete_example_presence: 2,
        initiative: 1,
        responsibility: 1,
        impact: 1,
        reflection: 0,
      },
      evidence: [
        {
          subscore: 'leadership_definition_quality',
          quote: 'For me, a leader is a person who leads others and is responsible.',
          reason: 'Definition is simplistic and does not demonstrate depth or maturity.',
        },
        {
          subscore: 'concrete_example_presence',
          quote: 'Sometimes I helped my classmates with homework, so I think it is also leadership.',
          reason: 'Provides a real but minimal example of helping peers.',
        },
        {
          subscore: 'initiative',
          quote: 'Sometimes I helped my classmates with homework...',
          reason: 'No clear indication that the candidate initiated the assistance; could be reactive.',
        },
        {
          subscore: 'responsibility',
          quote: 'I helped my classmates with homework.',
          reason: 'Shows some assistance but does not convey ownership of a larger task or decision-making.',
        },
        {
          subscore: 'impact',
          quote: 'I helped my classmates with homework.',
          reason: 'Impact is limited to individual classmates; no evidence of broader influence.',
        },
      ],
      weaknesses: [
        'Leadership definition lacks nuance.',
        'Example is minor and does not illustrate significant initiative or impact.',
        'No reflection on what was learned from the leadership experience.',
      ],
    },
    response_structure: {
      subscores: {
        clarity: 4,
        coherence: 3,
        completeness: 3,
        relevance: 4,
        conciseness: 4,
      },
      evidence: [
        {
          subscore: 'clarity',
          quote: 'Hi, my name is Daniyar. I want to apply to inVision U because I think it is a good university...',
          reason: 'Sentences are clear and easily understood.',
        },
        {
          subscore: 'coherence',
          quote: 'The response follows a logical order: motivation, program choice, challenge, goals, leadership view, family support.',
          reason: 'Ideas are presented in a sensible sequence, though transitions are simple.',
        },
        {
          subscore: 'completeness',
          quote: 'Addresses why applying, program interest, a challenge, long-term goal, definition of leader, example, and family support.',
          reason: 'All required prompts are touched, but depth is limited for several questions.',
        },
        {
          subscore: 'relevance',
          quote: 'Each paragraph directly answers one of the asked questions.',
          reason: 'Content stays on topic throughout.',
        },
        {
          subscore: 'conciseness',
          quote: 'The answer is brief and does not contain unnecessary repetition.',
          reason: 'Responses are short and to the point.',
        },
      ],
      weaknesses: [
        'Limited depth makes some answers feel superficial.',
        'Missing explicit statement of personal motivations beyond generic goals.',
      ],
    },
    context_notes: {
      family_support_context: 'My family supports me and wants me to study in a good university. My parents always tell me to study well and have a good future.',
      encouragement_source: 'Parents are the biggest source of encouragement.',
    },
    risk_flags: [],
    missing_evidence: [
      'Explicit articulation of personal intrinsic motivations beyond earning money and helping family.',
      'Detailed reflection on what was learned from the leadership example.',
    ],
  },
  model: 'openai/gpt-oss-120b',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const MAX_SCORES: Record<string, number> = {
  university_specificity: 5, program_fit: 5, goal_alignment: 5,
  intrinsic_motivation: 5, specificity_of_reasoning: 5,
  leadership_definition_quality: 5, concrete_example_presence: 5,
  initiative: 5, responsibility: 5, impact: 5, reflection: 5,
  clarity: 5, coherence: 5, completeness: 5, relevance: 5, conciseness: 5,
};

function formatKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function scoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return { bar: '#b5e220', text: 'text-[#6a8a10]', bg: 'bg-[#b5e220]/10' };
  if (pct >= 0.4) return { bar: '#fbbf24', text: 'text-amber-600', bg: 'bg-amber-50' };
  return { bar: '#f87171', text: 'text-red-500', bg: 'bg-red-50' };
}

function avgScore(subscores: Subscore) {
  const vals = Object.values(subscores);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100;
  const { bar } = scoreColor(score, max);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bar }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right flex-shrink-0">
        {score}/{max}
      </span>
    </div>
  );
}

function EvidenceCard({ ev }: { ev: Evidence }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Quote className="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 italic leading-relaxed">"{ev.quote}"</p>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed pl-5">{ev.reason}</p>
    </div>
  );
}

function CategoryCard({
  title,
  icon: Icon,
  analysis,
}: {
  title: string;
  icon: React.ElementType;
  analysis: CategoryAnalysis;
}) {
  const [expanded, setExpanded] = useState(false);
  const avg = avgScore(analysis.subscores);
  const maxAvg = 5;
  const { bar, text, bg } = scoreColor(avg, maxAvg);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-4 h-4 ${text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className={`text-xs font-semibold ${text}`}>avg {avg.toFixed(1)} / 5</p>
        </div>

        {/* Mini subscore bars */}
        <div className="hidden sm:flex items-center gap-1 mr-3">
          {Object.entries(analysis.subscores).map(([k, v]) => {
            const pct = (v / (MAX_SCORES[k] || 5)) * 100;
            const c = scoreColor(v, MAX_SCORES[k] || 5);
            return (
              <div key={k} title={formatKey(k)} className="w-1.5 h-8 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div className="w-full rounded-full transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%`, background: c.bar }} />
              </div>
            );
          })}
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {/* Subscores */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Subscores</p>
            <div className="space-y-2.5">
              {Object.entries(analysis.subscores).map(([k, v]) => {
                const max = MAX_SCORES[k] || 5;
                return (
                  <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">{formatKey(k)}</p>
                      <ScoreBar score={v} max={max} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Evidence</p>
            <div className="space-y-2">
              {analysis.evidence.map((ev, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold mb-1 pl-1">
                    {formatKey(ev.subscore)}
                  </p>
                  <EvidenceCard ev={ev} />
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          {analysis.weaknesses.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Weaknesses</p>
              <div className="space-y-1.5">
                {analysis.weaknesses.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                    <TrendingDown className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 leading-relaxed">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MLAnalysisPanel({ analysis = MOCK_ML_ANALYSIS }: { analysis?: MLAnalysis }) {
  const { answer, model } = analysis;

  const categories = [
    { key: 'motivation',          title: 'Motivation',        icon: Target,    data: answer.motivation },
    { key: 'leadership_potential', title: 'Leadership',       icon: Users,     data: answer.leadership_potential },
    { key: 'response_structure',  title: 'Response Structure', icon: AlignLeft, data: answer.response_structure },
  ];

  // Overall score: weighted avg across all subscores
  const allScores = categories.flatMap(c => Object.values(c.data.subscores));
  const overall = allScores.reduce((s, v) => s + v, 0) / allScores.length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-gray-300" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">AI Assessment</p>
        </div>
        <span className="text-[10px] text-gray-300 font-mono">{model}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Overall score pill */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Overall AI score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(overall / 5) * 100}%`, background: scoreColor(overall, 5).bar }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{overall.toFixed(1)}/5</span>
            </div>
          </div>
        </div>

        {/* Category cards */}
        <div className="space-y-3">
          {categories.map(c => (
            <CategoryCard key={c.key} title={c.title} icon={c.icon} analysis={c.data} />
          ))}
        </div>

        {/* Missing evidence */}
        {answer.missing_evidence.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold">Missing evidence</p>
            {answer.missing_evidence.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">{m}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risk flags */}
        {answer.risk_flags.length > 0 && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">Risk flags</p>
            {answer.risk_flags.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        )}

        {/* No risk flags */}
        {answer.risk_flags.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#b5e220]/10 rounded-lg border border-[#b5e220]/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6a8a10] flex-shrink-0" />
            <p className="text-xs text-[#6a8a10]">No risk flags detected</p>
          </div>
        )}

        {/* Context notes */}
        {Object.keys(answer.context_notes).length > 0 && (
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Context notes</p>
            {Object.entries(answer.context_notes).map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold mb-1">{formatKey(k)}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}