'use client';

import { Suspense, useState } from 'react';
import { Users, Play } from 'lucide-react';
import CandidatesTable from '@/components/candidates/CandidatesTableWithFavorites';
import CandidateFilters from '@/components/candidates/CandidateFilters';
import CandidateAdvancedFilters from '@/components/candidates/CandidateAdvancedFilters';
import type { AdvancedFilterState } from '@/components/candidates/CandidateAdvancedFilters';
import { OnboardingTour, useOnboarding } from '@/components/tours/Onboardingtour';

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-5">
            <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
            <div className="h-3 w-36 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse ml-auto" />
            <div className="h-5 w-20 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const { showTour, handleComplete, restartTour } = useOnboarding();

  // Smart filter preset (existing)
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Advanced metric filter (new)
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterState | null>(null);

  // When smart preset is selected → clear advanced filter, and vice versa
  const handlePreset = (preset: string | null) => {
    setActivePreset(preset);
    if (preset) setAdvancedFilter(null);
  };

  const handleAdvancedFilter = (state: AdvancedFilterState | null) => {
    setAdvancedFilter(state);
    if (state) setActivePreset(null);
  };

  return (
    <>
      {showTour && <OnboardingTour onComplete={handleComplete} />}

      <div className="w-[100%] mx-auto py-2 space-y-6">
        <div className="flex items-center justify-between" data-tour="header">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              inVision University
            </p>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#b5e220]/20 rounded-lg flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-[#4d7c0f]" />
              </div>
              Candidates
            </h1>
          </div>
          <div className="flex items-center gap-2">
 
            <button
              onClick={restartTour}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Play className="w-3 h-3" />
              Replay tour
            </button>
                       {/* Advanced Filters button */}
            <CandidateAdvancedFilters
              onFilterChange={handleAdvancedFilter}
              activeFilter={advancedFilter}
            />
          </div>
        </div>

        <div data-tour="filters">
          <CandidateFilters onSelectPreset={handlePreset} activePreset={activePreset} />
        </div>

        <div data-tour="table">
          <Suspense fallback={<TableSkeleton />}>
            <CandidatesTable
              preset={activePreset}
              advancedFilter={advancedFilter}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}