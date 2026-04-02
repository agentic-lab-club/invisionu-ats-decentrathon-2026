// components/ui/StatusBadge.tsx
'use client';

// Маппинг UI‑статусов на отображаемые названия и классы стилей
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'New',         className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  review:      { label: 'In Review',   className: 'bg-amber-50 text-amber-600 border border-amber-100' },
  recommended: { label: 'Recommended', className: 'bg-[#b5e220]/15 text-[#6a8a10] border border-[#b5e220]/30' },
  rejected:    { label: 'Rejected',    className: 'bg-red-50 text-red-500 border border-red-100' },
};

// Преобразование данных бэкенда в UI‑статус
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
  reviewStage: string;
  decision?: string;
}

export default function StatusBadge({ reviewStage, decision }: StatusBadgeProps) {
  const uiStatus = mapBackendToUIStatus(reviewStage, decision);
  const config = STATUS_CONFIG[uiStatus] || STATUS_CONFIG.new;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}