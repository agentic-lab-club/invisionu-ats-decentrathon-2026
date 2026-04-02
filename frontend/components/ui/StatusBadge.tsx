// components/ui/StatusBadge.tsx
'use client';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:       { label: 'Draft',       className: 'bg-gray-50 text-gray-500 border border-gray-200' },
  new:         { label: 'New',         className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  review:      { label: 'In Review',   className: 'bg-amber-50 text-amber-600 border border-amber-100' },
  recommended: { label: 'Recommended', className: 'bg-[#b5e220]/15 text-[#6a8a10] border border-[#b5e220]/30' },
  rejected:    { label: 'Rejected',    className: 'bg-red-50 text-red-500 border border-red-100' },
};

function mapBackendToUIStatus(reviewStage: string, decision?: string): string {
  if (reviewStage === 'initial_screening') return 'new';
  if (reviewStage === 'application_review') return 'review';
  if (reviewStage === 'decision') {
    if (decision === 'accepted') return 'recommended';
    if (decision === 'rejected') return 'rejected';
    return 'review';
  }
  return 'new';
}

interface StatusBadgeProps {
  reviewStage?: string;
  decision?: string;
  // Можно также явно передать статус (для черновика)
  explicitStatus?: keyof typeof STATUS_CONFIG;
}

export default function StatusBadge({ reviewStage, decision, explicitStatus }: StatusBadgeProps) {
  let uiStatus: string = 'draft'; // по умолчанию draft

  if (explicitStatus) {
    uiStatus = explicitStatus;
  } else if (reviewStage) {
    uiStatus = mapBackendToUIStatus(reviewStage, decision);
  }

  const config = STATUS_CONFIG[uiStatus] || STATUS_CONFIG.draft;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}