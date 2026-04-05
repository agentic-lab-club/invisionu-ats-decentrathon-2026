'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { BarChart2, PieChart as PieIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface StatusCount  { status: string;     count: number; }
interface ScoreRange   { score_range: string; count: number; }
interface CategoryAverages {
  motivation_avg:     number;
  leadership_avg:     number;
  values_avg:         number;
  planning_avg:       number;
  resilience_avg:     number;
  social_support_avg: number;
}
interface StatisticsResponse {
  source?:           string;
  statusCounts:      StatusCount[];
  scoreDistribution: ScoreRange[];
  categoryAverages:  CategoryAverages;
  topKeywords:       unknown[];
  ieltsDistribution: unknown[];
}

// ── Status config (matches CandidatesTableWithFavorites) ──────────────────────
const STATUS_COLORS: Record<string, string> = {
  new:         '#60a5fa',
  review:      '#fbbf24',
  recommended: '#b5e220',
  rejected:    '#f87171',
};
const STATUS_LABELS: Record<string, string> = {
  new:         'New',
  review:      'In Review',
  recommended: 'Recommended',
  rejected:    'Rejected',
};

// ── Shared chart tooltip ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-3 py-2 text-sm">
      {label && <p className="text-gray-400 text-xs mb-1">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium text-gray-800">
          {p.name ? `${p.name}: ` : ''}
          {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({
  icon: Icon, title, children,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-gray-300" />
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{title}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Pie label ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StatisticsPage() {
  const [statusCounts,      setStatusCounts]  = useState<StatusCount[]>([]);
  const [scoreDistribution, setScoreDistrib]  = useState<ScoreRange[]>([]);
  const [categoryAverages,  setCategoryAvg]   = useState<CategoryAverages>({
    motivation_avg: 0, leadership_avg: 0, values_avg: 0,
    planning_avg: 0,   resilience_avg: 0, social_support_avg: 0,
  });
  const [loading,     setLoading]     = useState(true);
  const [dataSource,  setDataSource]  = useState<string>('database');

  useEffect(() => {
    const token = getAccessToken();
    fetch('/api/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: StatisticsResponse) => {
        setDataSource(data.source || 'database');
        setStatusCounts(data.statusCounts  ?? []);
        setScoreDistrib(data.scoreDistribution ?? []);
        setCategoryAvg(data.categoryAverages ?? {
          motivation_avg: 0, leadership_avg: 0, values_avg: 0,
          planning_avg: 0,   resilience_avg: 0, social_support_avg: 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading statistics…</p>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (!statusCounts.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">No data yet. Add candidates via the application form.</p>
        </div>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalCandidates = statusCounts.reduce((sum, s) => sum + s.count, 0);

  const pieData = statusCounts.map(i => ({
    name:   STATUS_LABELS[i.status] || i.status,
    value:  i.count,
    status: i.status,
  }));

  // All 6 LLM metrics on a 0–5 scale
  const categoryData = [
    { name: 'Motivation',     value: +categoryAverages.motivation_avg.toFixed(2) },
    { name: 'Leadership',     value: +categoryAverages.leadership_avg.toFixed(2) },
    { name: 'Values',         value: +categoryAverages.values_avg.toFixed(2) },
    { name: 'Planning',       value: +categoryAverages.planning_avg.toFixed(2) },
    { name: 'Resilience',     value: +categoryAverages.resilience_avg.toFixed(2) },
    { name: 'Social Support', value: +categoryAverages.social_support_avg.toFixed(2) },
  ];

  const hasMetrics = categoryData.some(d => d.value > 0);

  const axisStyle = { fontSize: 11, fill: '#9ca3af', fontFamily: 'inherit' };
  const gridProps = { stroke: '#f3f4f6', strokeDasharray: '3 3' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#b5e220]/15 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-[#8aaa18]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
            inVision U
          </p>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">Statistics</h1>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-xs font-semibold text-gray-800 tabular-nums">{totalCandidates}</span>
        </div>
        {statusCounts.map(s => (
          <div
            key={s.status}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[s.status] || '#9ca3af' }}
            />
            <span className="text-xs text-gray-500">{STATUS_LABELS[s.status] || s.status}</span>
            <span className="text-xs font-semibold text-gray-800 tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Status pie */}
        <Card icon={PieIcon} title="Status distribution">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
            {pieData.map((d, i) => (
              <div key={`legend-${i}`} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[d.status] ?? '#9ca3af' }}
                />
                <span className="text-xs text-gray-500">{d.name}</span>
                <span className="text-xs font-medium text-gray-700">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Admissions Potential distribution */}
        {scoreDistribution.length > 0 && (
          <Card icon={BarChart2} title="Admissions potential distribution (0–5 scale)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution} barSize={32}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="score_range" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" name="Candidates" fill="#b5e220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Average LLM metrics — radar */}
        {hasMetrics && (
          <Card icon={TrendingUp} title="Average LLM metrics (0–5 scale)">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={categoryData}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'inherit' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fontSize: 10, fill: '#d1d5db' }}
                  tickCount={6}
                />
                <Radar
                  name="Avg"
                  dataKey="value"
                  stroke="#b5e220"
                  fill="#b5e220"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Numeric breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categoryData.map(d => (
                <div key={d.name} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500">{d.name}</span>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums">{d.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Metric bar chart (alternative view) */}
        {hasMetrics && (
          <Card icon={BarChart2} title="Metric averages — bar view">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} barSize={28} layout="vertical">
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" name="Average" fill="#b5e220" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}