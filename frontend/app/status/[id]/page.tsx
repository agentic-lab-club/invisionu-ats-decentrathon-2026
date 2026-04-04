// app/status/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, FileX, CheckCircle2, Clock, Search,
  Gavel, Bell, ChevronRight, FileText, Phone,
  Mail, RefreshCw, ExternalLink,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import StatusBadge from '@/components/ui/StatusBadge';  // <-- импорт компонента

interface CandidateDetail {
  application_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  program_name: string;
  review_stage: string;
  decision: string;
  screening_error?: string;
  submitted_at?: string;
}

interface StageConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STAGES: StageConfig[] = [
  { key: 'initial_screening',  label: 'Application Received', description: 'Your documents are being verified and processed by our team.', icon: Search },
  { key: 'application_review', label: 'Under Review',          description: 'The admissions committee is reviewing your application in detail.', icon: FileText },
  { key: 'decision',           label: 'Decision',              description: 'The committee has reached a final decision on your application.', icon: Gavel },
];

function getStageIndex(stage: string): number {
  return STAGES.findIndex(s => s.key === stage);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// StageStep теперь получает reviewStage и decision для передачи в StatusBadge
function StageStep({ stage, status, isLast, decision, reviewStage }: {
  stage: StageConfig;
  status: 'done' | 'active' | 'pending';
  isLast: boolean;
  decision?: string;
  reviewStage?: string;
}) {
  const Icon = stage.icon;
  const iconStyle =
    status === 'done'   ? { background: '#b5e220', color: '#1a2e05', border: '2px solid #b5e220' } :
    status === 'active' ? { background: '#fff', color: '#4d7c0f', border: '2px solid #b5e220', boxShadow: '0 0 0 4px rgba(181,226,32,0.15)' } :
                          { background: '#f9fafb', color: '#d1d5db', border: '2px solid #e5e7eb' };

  // Всегда используем название этапа (без подмены на статус решения)
  const label = stage.label;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500" style={iconStyle}>
          {status === 'done' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : status === 'active' ? (
            <div className="relative">
              <Icon className="w-4 h-4" />
              <span className="absolute -inset-1.5 rounded-full animate-ping opacity-30 bg-[#b5e220]" />
            </div>
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-1 transition-all duration-700" style={{ minHeight: 32, background: status === 'done' ? 'linear-gradient(to bottom, #b5e220, #d9f99d)' : '#e5e7eb' }} />
        )}
      </div>
      <div className="pb-7 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold transition-colors" style={{ color: status === 'pending' ? '#9ca3af' : '#111827' }}>{label}</p>
          {status === 'active' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: '#b5e220', color: '#1a2e05' }}>Current</span>
          )}
          {/* Используем StatusBadge только на последнем этапе, если есть решение */}
          {isLast && status !== 'pending' && decision && decision !== 'pending' && (
            <StatusBadge reviewStage={reviewStage} decision={decision} />
          )}
        </div>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: status === 'pending' ? '#d1d5db' : '#6b7280' }}>{stage.description}</p>
      </div>
    </div>
  );
}

function TelegramCTA() {
  return (
    <a href="https://t.me/invisionu_bot" target="_blank" rel="noopener noreferrer"
      className="group block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)', boxShadow: '0 4px 20px rgba(0,136,204,0.25)' }}>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Get status notifications</p>
          <p className="text-xs text-white/70 mt-0.5 leading-snug">Receive instant updates when your application moves to the next stage</p>
        </div>
        <div className="flex items-center gap-1 text-white/80 group-hover:text-white transition-colors flex-shrink-0">
          <Bell className="w-4 h-4" />
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </a>
  );
}

function NextStepCards({ stage, decision }: { stage: string; decision: string }) {
  if (stage === 'decision' && decision === 'accepted') {
    return (
      <div className="rounded-2xl p-5 space-y-2" style={{ background: '#f7fde8', border: '1px solid #d9f99d' }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4d7c0f]" />
          <p className="text-sm font-semibold text-[#1a2e05]">Congratulations! Next steps</p>
        </div>
        <ul className="space-y-1.5 pl-6">
          {[
            'Check your email for the official acceptance letter',
            'Complete your enrollment form within 14 days',
            'Submit any remaining documents',
            'Join the incoming students Telegram group',
          ].map((item, i) => (
            <li key={i} className="text-xs text-[#4d7c0f] flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-[#b5e220] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (stage === 'decision' && decision === 'rejected') {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
        <p className="text-sm font-semibold text-red-700 mb-1">Thank you for applying</p>
        <p className="text-xs text-red-600 leading-relaxed">
          We appreciate your interest in inVision University. While we couldn't offer you a place this time,
          we encourage you to apply again next cycle or explore our Foundation Year program.
        </p>
        <a href="mailto:admissions@invisionu.edu"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
          <Mail className="w-3.5 h-3.5" />
          Contact admissions
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[
        { icon: Clock, title: 'Typical timeline', body: 'Most applications receive a decision within 2–3 weeks of submission.', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
        { icon: Phone, title: 'Need help?',        body: 'Reach our admissions team at admissions@invisionu.edu with any questions.', color: '#4d7c0f', bg: '#f7fde8', border: '#d9f99d' },
      ].map(({ icon: Icon, title, body, color, bg, border }) => (
        <div key={title} className="rounded-xl p-4 space-y-1.5" style={{ background: bg, border: `1px solid ${border}` }}>
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            <p className="text-xs font-semibold" style={{ color }}>{title}</p>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">{body}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onApply }: { onApply: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
        <FileX className="w-6 h-6 text-gray-300" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">No application yet</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">You haven't submitted an application. Start one and we'll track its status here.</p>
      </div>
      <button onClick={onApply} className="mt-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors" style={{ background: '#b5e220', color: '#1a2e05' }}>
        Start application
      </button>
    </div>
  );
}

export default function StatusPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchStatus = async () => {
    const token = getAccessToken();
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/backend/applications/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) { setCandidate(null); setLoading(false); return; }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCandidate({
        application_id: data.application_id ?? '',
        first_name:     data.first_name ?? '',
        last_name:      data.last_name ?? '',
        email:          data.email,
        phone_number:   data.phone_number,
        program_name:   data.program_name ?? '',
        review_stage:   data.review_stage ?? '',
        decision:       data.decision ?? '',
        screening_error: data.screening_error,
        submitted_at:   data.submitted_at,
      });
      setLastChecked(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-[#b5e220]" />
      <span className="text-sm text-gray-400">Loading your application…</span>
    </div>
  );

  if (error) return (
    <div className="max-w-[600px] mx-auto py-10 px-6 text-center space-y-3">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
      <button onClick={() => router.push('/apply')} className="text-xs text-gray-400 hover:text-gray-600">Start your application →</button>
    </div>
  );

  if (!candidate?.application_id) return (
    <div className="max-w-[600px] mx-auto py-10 px-6">
      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">inVision University</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Application Status</h1>
      <EmptyState onApply={() => router.push('/apply')} />
    </div>
  );

  const c = candidate;
  const stageIdx   = getStageIndex(c.review_stage);
  const isDecided  = c.review_stage === 'decision';
  const fullName   = [c.first_name, c.last_name].filter(Boolean).join(' ');

  return (
    <div className="max-w-[600px] mx-auto py-8 px-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">inVision University</p>
          <h1 className="text-xl font-semibold text-gray-900">Application Status</h1>
        </div>
        <button onClick={fetchStatus}
          className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Applicant card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: '#fff' }}>
        <div className="h-1 w-full" style={{
          background: isDecided && c.decision === 'accepted' ? 'linear-gradient(90deg, #b5e220, #d9f99d)' :
                       isDecided && c.decision === 'rejected' ? 'linear-gradient(90deg, #fca5a5, #fecaca)' :
                       'linear-gradient(90deg, #b5e220, #d9f99d)',
        }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              {fullName && <p className="text-base font-semibold text-gray-900">{fullName}</p>}
              {c.program_name && <p className="text-xs text-gray-400 mt-0.5">{c.program_name}</p>}
              {c.submitted_at && <p className="text-[11px] text-gray-300 mt-1">Submitted {formatDate(c.submitted_at)}</p>}
            </div>
            {/* Используем StatusBadge вместо кастомного decisionUI */}
            {isDecided && c.decision !== 'pending' && (
              <StatusBadge reviewStage={c.review_stage} decision={c.decision} />
            )}
          </div>
          {c.screening_error && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">⚠️ {c.screening_error}</div>
          )}
        </div>
      </div>

      {/* Progress pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-5">Application progress</p>
        {STAGES.map((stage, idx) => {
          const status: 'done' | 'active' | 'pending' = idx < stageIdx ? 'done' : idx === stageIdx ? 'active' : 'pending';
          return (
            <StageStep
              key={stage.key}
              stage={stage}
              status={status}
              isLast={idx === STAGES.length - 1}
              decision={c.decision}
              reviewStage={c.review_stage}
            />
          );
        })}
      </div>

      {/* Context cards */}
      <NextStepCards stage={c.review_stage} decision={c.decision} />

      {/* Telegram CTA */}
      <TelegramCTA />

      {/* Footer */}
      <p className="text-[11px] text-gray-300 text-center pb-2">
        Last checked {lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        ID: {c.application_id.slice(0, 8)}…
      </p>
    </div>
  );
}