import { Suspense } from 'react';
import CandidatesTable from '@/components/candidates/CandidatesTable';
import { Users } from 'lucide-react';

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-6">
            <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#b5e220]/15 flex items-center justify-center">
          <Users className="w-4 h-4 text-[#8aaa18]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">inVision U</p>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">Candidates</h1>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CandidatesTable />
      </Suspense>
    </div>
  );
}