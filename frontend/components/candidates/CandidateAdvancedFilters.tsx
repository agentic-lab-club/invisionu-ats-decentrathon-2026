'use client';

import { useState, useCallback } from 'react';
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetricRange {
  min: number;
  max: number;
}

export interface AdvancedFilterState {
  motivation:           MetricRange;
  leadership:           MetricRange;
  planning:             MetricRange;
  resilience:           MetricRange;
  values:               MetricRange;
  social_support:       MetricRange;
  admissions_potential: MetricRange;
  leadership_index:     MetricRange;
  program_code:         string;
  review_stage:         string;
}

const METRIC_MAX = 5;

const DEFAULT_STATE: AdvancedFilterState = {
  motivation:           { min: 0, max: METRIC_MAX },
  leadership:           { min: 0, max: METRIC_MAX },
  planning:             { min: 0, max: METRIC_MAX },
  resilience:           { min: 0, max: METRIC_MAX },
  values:               { min: 0, max: METRIC_MAX },
  social_support:       { min: 0, max: METRIC_MAX },
  admissions_potential: { min: 0, max: METRIC_MAX },
  leadership_index:     { min: 0, max: METRIC_MAX },
  program_code:         '',
  review_stage:         '',
};

// Returns true if state differs from defaults (i.e. any filter is active)
function isActive(state: AdvancedFilterState): boolean {
  const metricKeys = [
    'motivation','leadership','planning','resilience',
    'values','social_support','admissions_potential','leadership_index',
  ] as const;
  return (
    metricKeys.some(k => state[k].min > 0 || state[k].max < METRIC_MAX) ||
    state.program_code !== '' ||
    state.review_stage !== ''
  );
}

// ─── Metric config ────────────────────────────────────────────────────────────

interface MetricConfig {
  key: keyof Pick<AdvancedFilterState,
    'motivation'|'leadership'|'planning'|'resilience'|
    'values'|'social_support'|'admissions_potential'|'leadership_index'>;
  label: string;
  description: string;
  color: string;       // track fill color
  group: 'interview' | 'score';
}

const METRICS: MetricConfig[] = [
  // Interview metrics
  { key: 'motivation',           label: 'Motivation',        description: 'Drive and passion for the program',      color: '#f59e0b', group: 'interview' },
  { key: 'leadership',           label: 'Leadership',        description: 'Demonstrated leadership ability',        color: '#3b82f6', group: 'interview' },
  { key: 'planning',             label: 'Planning',          description: 'Clarity of thought & structure',         color: '#8b5cf6', group: 'interview' },
  { key: 'resilience',           label: 'Resilience',        description: 'Ability to overcome challenges',         color: '#10b981', group: 'interview' },
  { key: 'values',               label: 'Values',            description: 'Alignment with university values',       color: '#ec4899', group: 'interview' },
  { key: 'social_support',       label: 'Social Support',    description: 'Family & community backing',             color: '#06b6d4', group: 'interview' },
  // Composite scores
  { key: 'admissions_potential', label: 'Admissions Potential', description: 'Overall admissions composite score', color: '#b5e220', group: 'score' },
  { key: 'leadership_index',     label: 'Leadership Index',  description: 'Composite leadership score',             color: '#f97316', group: 'score' },
];

const PROGRAMS = [
  { code: '', label: 'All programs' },
  { code: 'undergrad_society',       label: 'Society' },
  { code: 'undergrad_art_media',     label: 'Art + Media' },
  { code: 'undergrad_tech',          label: 'Tech' },
  { code: 'undergrad_policy_reform', label: 'Policy Reform' },
  { code: 'undergrad_engineering',   label: 'Engineering' },
  { code: 'foundation_year',         label: 'Foundation Year' },
];

const STAGES = [
  { code: '', label: 'All stages' },
  { code: 'initial_screening',  label: 'Initial Screening' },
  { code: 'application_review', label: 'Application Review' },
  { code: 'decision',           label: 'Decision' },
];

// ─── RangeSlider ──────────────────────────────────────────────────────────────

function RangeSlider({
  metric,
  value,
  onChange,
}: {
  metric: MetricConfig;
  value: MetricRange;
  onChange: (r: MetricRange) => void;
}) {
  const pctMin = (value.min / METRIC_MAX) * 100;
  const pctMax = (value.max / METRIC_MAX) * 100;
  const isFiltered = value.min > 0 || value.max < METRIC_MAX;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: metric.color }}
          />
          <span className="text-xs font-semibold text-gray-700">{metric.label}</span>
          {isFiltered && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${metric.color}18`, color: metric.color }}
            >
              active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 tabular-nums">
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
            style={isFiltered ? { background: `${metric.color}15`, color: metric.color } : { color: '#9ca3af' }}
          >
            {value.min.toFixed(1)} – {value.max.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-5 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 bg-gray-100 rounded-full" />
        {/* Active fill */}
        <div
          className="absolute h-1.5 rounded-full transition-all"
          style={{
            left: `${pctMin}%`,
            right: `${100 - pctMax}%`,
            background: isFiltered ? metric.color : '#d1d5db',
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={0}
          max={METRIC_MAX}
          step={0.1}
          value={value.min}
          onChange={e => {
            const v = Math.min(parseFloat(e.target.value), value.max - 0.1);
            onChange({ ...value, min: Math.round(v * 10) / 10 });
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent cursor-pointer"
          style={{ zIndex: value.min > METRIC_MAX - 0.5 ? 5 : 3 }}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={0}
          max={METRIC_MAX}
          step={0.1}
          value={value.max}
          onChange={e => {
            const v = Math.max(parseFloat(e.target.value), value.min + 0.1);
            onChange({ ...value, max: Math.round(v * 10) / 10 });
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed">{metric.description}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CandidateAdvancedFiltersProps {
  onFilterChange: (state: AdvancedFilterState | null) => void;
  activeFilter: AdvancedFilterState | null;
}

export default function CandidateAdvancedFilters({
  onFilterChange,
  activeFilter,
}: CandidateAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AdvancedFilterState>(DEFAULT_STATE);

  const current = activeFilter ?? state;
  const filterActive = isActive(current);

  const updateMetric = useCallback((key: MetricConfig['key'], range: MetricRange) => {
    setState(prev => ({ ...prev, [key]: range }));
  }, []);

  const handleApply = () => {
    onFilterChange(isActive(state) ? state : null);
    setOpen(false);
  };

  const handleReset = () => {
    setState(DEFAULT_STATE);
    onFilterChange(null);
  };

  const interviewMetrics = METRICS.filter(m => m.group === 'interview');
  const scoreMetrics     = METRICS.filter(m => m.group === 'score');

  // Count active metric filters
  const activeCount = METRICS.filter(m => {
    const v = current[m.key];
    return v.min > 0 || v.max < METRIC_MAX;
  }).length + (current.program_code ? 1 : 0) + (current.review_stage ? 1 : 0);

  return (
    <div className="relative">
      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-all duration-150 focus:outline-none"
        style={
          filterActive
            ? { borderColor: '#b5e220', background: '#f7fde8', color: '#4d7c0f', boxShadow: '0 0 0 1px #b5e220' }
            : { borderColor: '#e5e7eb', background: '#fff', color: '#6b7280' }
        }
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Advanced Filters</span>
        {activeCount > 0 && (
          <span
            className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
            style={{ background: '#b5e220', color: '#1a2e05' }}
          >
            {activeCount}
          </span>
        )}
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-gray-100 shadow-xl"
          style={{ width: 560, maxHeight: '80vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">Advanced Filters</span>
              {activeCount > 0 && (
                <span className="text-[11px] text-gray-400">{activeCount} active</span>
              )}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* ── Dropdown filters ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Program</label>
                <select
                  value={state.program_code}
                  onChange={e => setState(prev => ({ ...prev, program_code: e.target.value }))}
                  className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 appearance-none cursor-pointer"
                >
                  {PROGRAMS.map(p => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Stage</label>
                <select
                  value={state.review_stage}
                  onChange={e => setState(prev => ({ ...prev, review_stage: e.target.value }))}
                  className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 appearance-none cursor-pointer"
                >
                  {STAGES.map(s => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Interview metrics ── */}
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                Interview Metrics
              </p>
              <div className="space-y-5">
                {interviewMetrics.map(m => (
                  <RangeSlider
                    key={m.key}
                    metric={m}
                    value={state[m.key]}
                    onChange={r => updateMetric(m.key, r)}
                  />
                ))}
              </div>
            </div>

            {/* ── Composite scores ── */}
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                Composite Scores
              </p>
              <div className="space-y-5">
                {scoreMetrics.map(m => (
                  <RangeSlider
                    key={m.key}
                    metric={m}
                    value={state[m.key]}
                    onChange={r => updateMetric(m.key, r)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between sticky bottom-0 bg-white z-40">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
              style={{ background: '#b5e220', color: '#1a2e05' }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slider thumb styles ── */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #d1d5db;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        input[type=range]:hover::-webkit-slider-thumb,
        input[type=range]:focus::-webkit-slider-thumb {
          border-color: #b5e220;
          box-shadow: 0 0 0 3px rgba(181,226,32,0.2);
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #d1d5db;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
}