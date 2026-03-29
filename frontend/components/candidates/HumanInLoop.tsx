'use client';

import { useState, useEffect } from 'react';

interface HumanInLoopProps {
  candidateId: string;
  initialStatus?: string;
  onStatusUpdate?: (newStatus: string) => void;
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
      const response = await fetch(`/api/candidates/${candidateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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
    { value: 'interview', label: 'Interview', color: 'bg-purple-100 text-purple-800' },
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