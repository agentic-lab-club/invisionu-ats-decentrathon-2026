'use client';

import { useState } from 'react';
import { Settings, CheckCircle2, AlertCircle } from 'lucide-react';

interface Weight { category: string; weight: number; }

const defaultWeights: Weight[] = [
  { category: 'Technical skills', weight: 35 },
  { category: 'Soft skills',      weight: 25 },
  { category: 'Work experience',  weight: 20 },
  { category: 'Education',        weight: 10 },
  { category: 'Motivation',       weight: 10 },
];

export default function SettingsPage() {
  const [weights, setWeights] = useState<Weight[]>(defaultWeights);
  const [saved, setSaved] = useState(false);

  const update = (idx: number, val: number) => {
    const next = [...weights];
    next[idx] = { ...next[idx], weight: Math.min(100, Math.max(0, val)) };
    setWeights(next);
    setSaved(false);
  };

  const total = weights.reduce((s, w) => s + w.weight, 0);
  const valid = total === 100;

  const handleSave = () => {
    if (!valid) return;
    // persist here
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#b5e220]/15 flex items-center justify-center">
          <Settings className="w-4 h-4 text-[#8aaa18]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">inVision U</p>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">Settings</h1>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Scoring weights</p>
          <p className="text-xs text-gray-400 mt-1">
            Assign a weight to each category to calculate the candidate's overall score. Weights must sum to 100%.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {weights.map((w, idx) => {
            const pct = w.weight;
            return (
              <div key={w.category}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                    {w.category}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={w.weight}
                      onChange={e => update(idx, Number(e.target.value))}
                      min={0} max={100}
                      className="w-14 text-center text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all appearance-none tabular-nums"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>

                {/* Track */}
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                    style={{ width: `${pct}%`, background: '#b5e220' }}
                  />
                </div>

                {/* Range input (invisible, overlays the track) */}
                <input
                  type="range" min={0} max={100} step={1} value={w.weight}
                  onChange={e => update(idx, Number(e.target.value))}
                  className="w-full h-2 opacity-0 -mt-2 cursor-pointer relative z-10"
                  style={{ marginTop: '-8px' }}
                />
              </div>
            );
          })}

          {/* Total */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {valid
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <AlertCircle className="w-4 h-4 text-red-400" />
              }
              <span className="text-sm text-gray-600">Total weight</span>
            </div>
            <span className={`text-lg font-semibold tabular-nums ${valid ? 'text-gray-900' : 'text-red-500'}`}>
              {total}%
            </span>
          </div>

          {!valid && (
            <p className="text-xs text-red-400">
              Adjust the weights so they add up to exactly 100% (currently {total > 100 ? `${total - 100}% over` : `${100 - total}% under`}).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm ${
              valid
                ? 'bg-[#b5e220] text-gray-900 hover:bg-[#a3cc1a]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : 'Save weights'}
          </button>
        </div>
      </div>
    </div>
  );
}