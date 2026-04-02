'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

interface HumanInLoopProps {
  candidateId: string;
  initialStatus?: string;
  onStatusUpdate?: (newStatus: string) => void; // принимает новый статус
}

export default function HumanInLoop({ candidateId, initialStatus = 'new', onStatusUpdate }: HumanInLoopProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      let payload: any = {};
      if (newStatus === 'new') {
        payload = { review_stage: 'initial_screening' };
      } else if (newStatus === 'review') {
        payload = { review_stage: 'application_review' };
      } else if (newStatus === 'recommended') {
        payload = { review_stage: 'decision', decision: 'accepted' };
      } else if (newStatus === 'rejected') {
        payload = { review_stage: 'decision', decision: 'rejected' };
      } else {
        console.warn(`Unsupported status: ${newStatus}`);
        setLoading(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.error('No access token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/backend/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update');
      setStatus(newStatus);
      onStatusUpdate?.(newStatus);
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setLoading(false);
    }
  };

  const statuses = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'recommended', label: 'Recommended', color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            disabled={loading || status === s.value}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === s.value
                ? s.color
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {loading && <p className="text-sm text-gray-500">Updating...</p>}
    </div>
  );
}