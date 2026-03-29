'use client';

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';

interface SkillsRadarProps {
  data: Record<string, number>;
}

export default function SkillsRadar({ data }: SkillsRadarProps) {
  const chartData = Object.entries(data).map(([subject, value]) => ({
    subject,
    value,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius="70%"
        data={chartData}
        margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
      >
        <PolarGrid
          stroke="#e5e7eb"
          strokeWidth={1}
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tickCount={5}
          tick={{ fill: '#d1d5db', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#b5e220"
          strokeWidth={2}
          fill="#b5e220"
          fillOpacity={0.18}
          dot={{ r: 3, fill: '#b5e220', strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}