'use client';

import {
  Zap, TrendingUp, Award, Star,
  X, SlidersHorizontal,
} from 'lucide-react';

interface FilterPreset {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;       // border + icon color (active ring)
  iconBg: string;       // icon container bg
  iconColor: string;    // icon stroke color
  restingBorder: string;
  restingBg: string;
}

const PRESETS: FilterPreset[] = [
  {
    id: 'high_potential_low_english',
    label: 'Talented leader, low English',
    description: 'High leadership potential (>4.0) with IELTS <6.0 or low structure score (<3.0)',
    icon: Zap,
    accent: '#f59e0b',
    iconBg: '#fef3c720',
    iconColor: '#d97706',
    restingBorder: '#fde68a',
    restingBg: '#fffbeb',
  },
  {
    id: 'strong_motivation_weak_soft',
    label: 'Strong motivation, weak soft skills',
    description: 'Motivation >4.0, leadership <3.0, with documented projects or experience',
    icon: TrendingUp,
    accent: '#3b82f6',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    restingBorder: '#bfdbfe',
    restingBg: '#eff6ff',
  },
  {
    id: 'low_motivation_high_background',
    label: 'Low motivation, high background',
    description: 'Motivation <2.5, leadership >3.5, with many achievements',
    icon: Award,
    accent: '#10b981',
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    restingBorder: '#a7f3d0',
    restingBg: '#ecfdf5',
  },
  {
    id: 'top10_percent',
    label: 'Top 10% overall potential',
    description: 'Overall score above the 90th percentile across all applicants',
    icon: Star,
    accent: '#8b5cf6',
    iconBg: '#f5f3ff',
    iconColor: '#7c3aed',
    restingBorder: '#ddd6fe',
    restingBg: '#f5f3ff',
  },
];

export default function CandidateFilters({
  onSelectPreset,
  activePreset,
}: {
  onSelectPreset: (presetId: string | null) => void;
  activePreset: string | null;
}) {
  const active = PRESETS.find(p => p.id === activePreset);

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-300" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
            Smart filters
          </p>
        </div>

      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PRESETS.map(preset => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(isActive ? null : preset.id)}
              className="group text-left rounded-xl border transition-all duration-150 p-4 focus:outline-none"
              style={
                isActive
                  ? {
                      borderColor: preset.accent,
                      background: `${preset.accent}10`,
                      boxShadow: `0 0 0 1px ${preset.accent}`,
                    }
                  : {
                      borderColor: preset.restingBorder,
                      background: preset.restingBg,
                    }
              }
            >
              {/* Icon + label row */}
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{ background: isActive ? `${preset.accent}25` : preset.iconBg }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: preset.iconColor }}
                  />
                </div>
                <p
                  className="text-xs font-semibold leading-snug transition-colors"
                  style={{ color: isActive ? preset.iconColor : '#374151' }}
                >
                  {preset.label}
                </p>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 pl-10">
                {preset.description}
              </p>

            </button>
          );
        })}
      </div>

      {/* Active filter summary pill */}
      {active && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: `${active.accent}10`,
            border: `0.5px solid ${active.accent}40`,
            color: active.iconColor,
          }}
        >
          <active.icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Filtering by: <span className="font-medium">{active.label}</span></span>
          <button
            onClick={() => onSelectPreset(null)}
            className="ml-auto transition-opacity hover:opacity-60"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}