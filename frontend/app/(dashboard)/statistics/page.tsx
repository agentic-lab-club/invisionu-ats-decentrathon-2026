'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { BarChart2, PieChart as PieIcon, TrendingUp, MessageSquare, AlertCircle } from 'lucide-react';

interface StatusCount  { status: string; count: number; }
interface ScoreRange   { score_range: string; count: number; }
interface CategoryAverages { motivation_avg: number; leadership_avg: number; structure_avg: number; }
interface Keyword      { word: string; frequency: number; }
interface IeltsRange   { ielts_range: string; count: number; }

const STATUS_COLORS: Record<string, string> = {
  new: '#60a5fa', review: '#fbbf24', interview: '#a78bfa',
  recommended: '#b5e220', rejected: '#f87171',
};
const STATUS_LABELS: Record<string, string> = {
  new: 'New', review: 'In Review', interview: 'Interview',
  recommended: 'Recommended', rejected: 'Rejected',
};

// ── shared tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-3 py-2 text-sm">
      {label && <p className="text-gray-400 text-xs mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium text-gray-800">
          {p.name ? `${p.name}: ` : ''}{p.value}
        </p>
      ))}
    </div>
  );
};

// ── card wrapper ────────────────────────────────────────────────────────────
function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
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

// ── custom pie label ─────────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      className="text-[11px] font-semibold" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function StatisticsPage() {
  const [statusCounts, setStatusCounts]       = useState<StatusCount[]>([]);
  const [scoreDistribution, setScoreDistrib]  = useState<ScoreRange[]>([]);
  const [categoryAverages, setCategoryAvg]    = useState<CategoryAverages>({ motivation_avg: 0, leadership_avg: 0, structure_avg: 0 });
  const [topKeywords, setTopKeywords]         = useState<Keyword[]>([]);
  const [ieltsDistribution, setIeltsDist]     = useState<IeltsRange[]>([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        setStatusCounts(data.statusCounts);
        setScoreDistrib(data.scoreDistribution);
        setCategoryAvg(data.categoryAverages);
        setTopKeywords(data.topKeywords);
        setIeltsDist(data.ieltsDistribution || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const empty = !statusCounts.length && !scoreDistribution.length && !ieltsDistribution.length;
  if (empty) {
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

  const pieData = statusCounts.map(i => ({
    name: STATUS_LABELS[i.status] || i.status,
    value: i.count,
    status: i.status,
  }));

  const categoryData = [
    { name: 'Motivation',  value: Math.round(categoryAverages.motivation_avg) },
    { name: 'Leadership',  value: Math.round(categoryAverages.leadership_avg) },
    { name: 'Structure',   value: Math.round(categoryAverages.structure_avg) },
  ];

  const axisStyle = { fontSize: 11, fill: '#9ca3af', fontFamily: 'inherit' };
  const gridProps = { stroke: '#f3f4f6', strokeDasharray: '3 3' };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#b5e220]/15 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-[#8aaa18]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">inVision U</p>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">Statistics</h1>
        </div>
      </div>

      {/* Summary pills */}
      {statusCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusCounts.map(s => (
            <div key={s.status} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status] || '#9ca3af' }} />
              <span className="text-xs text-gray-500">{STATUS_LABELS[s.status] || s.status}</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">{s.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
<Card icon={PieIcon} title="Status distribution">
  {pieData.length > 0 ? (
    <>
      <div className="h-[280px] w-full"> {/* Явная высота обязательна */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"           // лучше использовать проценты
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

      {/* Legend */}
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
    </>
  ) : (
    <p className="text-sm text-gray-400 text-center py-12">No status data</p>
  )}
</Card>

        {/* IELTS distribution */}
        {ieltsDistribution.length > 0 && (
          <Card icon={BarChart2} title="IELTS distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ieltsDistribution} barSize={24}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="ielts_range" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" fill="#b5e220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Score distribution */}
        {scoreDistribution.length > 0 && (
          <Card icon={BarChart2} title="Overall score distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution} barSize={24}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="score_range" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" fill="#b5e220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Category averages */}
        <Card icon={TrendingUp} title="Average scores by category">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={categoryData}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="value" stroke="#b5e220" strokeWidth={2.5}
                dot={{ r: 4, fill: '#b5e220', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#8aaa18', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top keywords */}
        <Card icon={MessageSquare} title="Top keywords in explanations">
          {topKeywords.length > 0 ? (
            <div className="space-y-1">
              {topKeywords.map((kw, i) => {
                const max = topKeywords[0]?.frequency || 1;
                const pct = (kw.frequency / max) * 100;
                return (
                  <div key={kw.word} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-300 tabular-nums w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate">{kw.word}</span>
                        <span className="text-xs text-gray-400 tabular-nums ml-2 flex-shrink-0">{kw.frequency}×</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#b5e220] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No keyword data</p>
          )}
        </Card>
      </div>
    </div>
  );
}