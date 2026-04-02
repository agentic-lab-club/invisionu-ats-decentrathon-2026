// app/status/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, FileX } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';
interface CandidateDetail {
  application_id: string;
  first_name: string;
  last_name: string;
  program_name: string;
  review_stage: string;
  decision: string;
  screening_error?: string;
}

const stageLabels: Record<string, string> = {
  initial_screening: 'Initial Screening',
  application_review: 'Application Review',
  decision: 'Decision',
};

function hasApplication(candidate: CandidateDetail | null): boolean {
  if (!candidate) return false;
  return !!(candidate.application_id && candidate.review_stage && candidate.decision);
}

function EmptyState({ onApply }: { onApply: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
        <FileX className="w-6 h-6 text-gray-300" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">No application yet</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          You haven't submitted an application. Start one and we'll track its status here.
        </p>
      </div>
      <button
        onClick={onApply}
        className="mt-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#b5e220] hover:bg-[#a3cc1a] rounded-xl transition-colors"
      >
        Start application
      </button>
    </div>
  );
}

export default function StatusPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      const token = getAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const res = await fetch('/api/backend/applications/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          // 404 = заявки нет, показываем empty state, не ошибку
          setCandidate(null);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCandidate({
          application_id: data.application_id ?? '',
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          program_name: data.program_name ?? '',
          review_stage: data.review_stage ?? '',
          decision: data.decision ?? '',
          screening_error: data.screening_error,
        });
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#b5e220]" />
        <span className="text-sm text-gray-400">Loading your application status…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[680px] mx-auto p-6 text-center">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
        <button
          onClick={() => router.push('/apply')}
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300"
        >
          Start your application
        </button>
      </div>
    );
  }

  // Пустые поля или null — показываем empty state
  if (!hasApplication(candidate)) {
    return (
      <div className="max-w-[680px] mx-auto py-10 px-6">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Applications</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-0.5">Application status</h1>
        </div>
        <EmptyState onApply={() => router.push('/apply')} />
      </div>
    );
  }

  return (
    <div className="max-w-[680px] mx-auto py-10 px-6 space-y-4">
      <div className="mb-2">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Applications</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-0.5">Application status</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#b5e220] via-[#8aaa18] to-[#b5e220]" />
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Your application</h2>
          {(candidate!.first_name || candidate!.program_name) && (
            <p className="text-sm text-gray-400 mt-0.5">
              {[candidate!.first_name, candidate!.last_name].filter(Boolean).join(' ')}
              {candidate!.program_name && ` · ${candidate!.program_name}`}
            </p>
          )}

          <div className="mt-5 space-y-0 divide-y divide-gray-50">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Current stage</span>
              <span className="text-sm font-medium text-gray-900">
                {stageLabels[candidate!.review_stage] || candidate!.review_stage}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge reviewStage={candidate!.review_stage} decision={candidate!.decision} />
            </div>
          </div>

          {candidate!.screening_error && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
              ⚠️ {candidate!.screening_error}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 px-1">
        We'll notify you when your application moves to the next stage. Contact admissions if you have any questions.
      </p>
    </div>
  );
}