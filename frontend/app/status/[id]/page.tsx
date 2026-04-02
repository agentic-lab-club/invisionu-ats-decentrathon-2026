// app/status/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
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
      // Вместо candidates/{id} используем applications/status
      const res = await fetch('/api/backend/applications/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setError('No application found.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Эндпоинт возвращает { application_id, review_stage, decision, screening_error }
      setCandidate({
        application_id: data.application_id,
        first_name: '', // этих полей нет в ответе, можно убрать или загрузить отдельно
        last_name: '',
        program_name: '',
        review_stage: data.review_stage,
        decision: data.decision,
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#b5e220]" />
        <span className="ml-2 text-gray-500">Loading your application status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
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

  if (!candidate) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Your application status</h1>
        <p className="text-gray-500 text-sm mt-1">
          {candidate.first_name} {candidate.last_name} · {candidate.program_name}
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-600">Current stage</span>
            <span className="font-medium text-gray-900">{stageLabels[candidate.review_stage] || candidate.review_stage}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-600">Status</span>
            <StatusBadge reviewStage={candidate.review_stage} decision={candidate.decision} />
          </div>
          {candidate.screening_error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
              ⚠️ {candidate.screening_error}
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            We'll notify you when your application moves to the next stage. Check back later or contact admissions if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}