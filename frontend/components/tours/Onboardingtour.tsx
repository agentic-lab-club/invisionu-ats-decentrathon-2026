'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Users, X, ChevronRight, ChevronLeft,
  FileText, Calendar, BookOpen, CheckCircle2,
  Clock, Sparkles, GraduationCap, ClipboardList,
  ArrowRight, Play, SkipForward,
} from 'lucide-react';

// ================== Types ==================
type Role = 'applicant' | 'committee' | null;

interface TooltipStep {
  target: string;           // CSS selector of element to highlight
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;             // extra callout tip
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingProps {
  onComplete: (role: Role) => void;
}

// ================== Step definitions ==================
const APPLICANT_STEPS: TooltipStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Send your application',
    description: 'When you\'re ready, click "Send Application" at the top right. You can fill the form in any order — all tabs are independent.',
    icon: Sparkles,
    tip: 'Deadline: May 30, 2025. Start early!',
    position: 'bottom',
  },
  {
    target: '[data-tour="tabs"]',
    title: '5 sections to complete',
    description: 'Fill in Personal info, Contact details, Education docs, the Internal test, and Social status. Each tab saves automatically.',
    icon: ClipboardList,
    tip: 'The Internal test has 40 personality questions — no right or wrong answers.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-personal"]',
    title: 'Start with personal info',
    description: 'Enter your full name, IIN, date of birth, and upload a copy of your passport or ID card (JPG, PNG, HEIC, up to 10 MB).',
    icon: User,
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-education"]',
    title: 'Key documents for education',
    description: 'You\'ll need a link to your video presentation, your English proficiency exam results, and optionally an engineering portfolio (PDF).',
    icon: GraduationCap,
    tip: 'IELTS 6.0+, TOEFL 80+, or Duolingo 110+ are accepted.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Track your deadline',
    description: 'The sidebar shows how much time is left, which stage you\'re at, and which documents are required. Check it regularly.',
    icon: Clock,
    tip: 'Applications submitted early get reviewed first.',
    position: 'left',
  },
  {
    target: '[data-tour="sidebar-docs"]',
    title: 'Required documents checklist',
    description: 'Make sure you have all 5 documents ready before submitting: Passport/ID, Video, English results, UNT/NIS certificate, and Portfolio.',
    icon: FileText,
    position: 'left',
  },
];

const COMMITTEE_STEPS: TooltipStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Committee dashboard',
    description: 'From this view you can review submitted applications, run batch scoring, and pass candidates to the next stage.',
    icon: Users,
    tip: 'All actions are logged with timestamp and reviewer ID.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tabs"]',
    title: 'Application sections',
    description: 'Each tab corresponds to a section of the candidate\'s application. Review them in order for a consistent scoring experience.',
    icon: ClipboardList,
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-education"]',
    title: 'Education & documents',
    description: 'The video presentation link and uploaded documents appear here. Flag missing or unverified items for follow-up.',
    icon: BookOpen,
    tip: 'You can add internal notes visible only to committee members.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Pipeline stages',
    description: 'The stage tracker shows where this candidate sits in the process — from Application Stage through to Decision.',
    icon: CheckCircle2,
    position: 'left',
  },
  {
    target: '[data-tour="sidebar-docs"]',
    title: 'Document verification',
    description: 'Mark each required document as verified or request a re-upload. Incomplete document sets automatically flag the candidate.',
    icon: FileText,
    tip: 'Batch verify all documents in one click from the candidate list view.',
    position: 'left',
  },
];

// ================== Highlight overlay ==================
function HighlightBox({
  rect,
  padding = 8,
}: {
  rect: DOMRect | null;
  padding?: number;
}) {
  if (!rect) return null;
  return (
    <>
      {/* dark overlay with cutout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      >
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="cutout">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.45)"
            mask="url(#cutout)"
          />
          {/* accent border around target */}
          <rect
            x={rect.left - padding}
            y={rect.top - padding}
            width={rect.width + padding * 2}
            height={rect.height + padding * 2}
            rx="10"
            fill="none"
            stroke="#b5e220"
            strokeWidth="2"
            opacity="0.8"
          />
        </svg>
      </div>
    </>
  );
}

// ================== Tooltip card ==================
function TooltipCard({
  step,
  index,
  total,
  rect,
  onNext,
  onPrev,
  onSkip,
  role,
}: {
  step: TooltipStep;
  index: number;
  total: number;
  rect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  role: Role;
}) {
  const Icon = step.icon;
  const isLast = index === total - 1;

  // Calculate tooltip position relative to highlight
  const getStyle = (): React.CSSProperties => {
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: 360,
      };
    }

    const pad = 16;
    const tooltipW = 360;
    const pos = step.position ?? 'bottom';

    if (pos === 'bottom') {
      return {
        position: 'fixed',
        top: rect.bottom + pad,
        left: Math.min(rect.left, window.innerWidth - tooltipW - 16),
        zIndex: 9999,
        width: tooltipW,
      };
    }
    if (pos === 'top') {
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + pad,
        left: Math.min(rect.left, window.innerWidth - tooltipW - 16),
        zIndex: 9999,
        width: tooltipW,
      };
    }
    if (pos === 'left') {
      return {
        position: 'fixed',
        top: Math.max(rect.top, 16),
        right: window.innerWidth - rect.left + pad,
        zIndex: 9999,
        width: tooltipW,
      };
    }
    if (pos === 'right') {
      return {
        position: 'fixed',
        top: Math.max(rect.top, 16),
        left: rect.right + pad,
        zIndex: 9999,
        width: tooltipW,
      };
    }
    return { position: 'fixed', top: 100, left: 100, zIndex: 9999, width: tooltipW };
  };

  const accentColor = role === 'committee' ? '#6366f1' : '#b5e220';
  const accentText = role === 'committee' ? '#2d2f8a' : '#1a2200';

  return (
    <div
      style={getStyle()}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-in"
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${((index + 1) / total) * 100}%`,
            background: accentColor,
          }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}20` }}
            >
              <Icon className="w-4 h-4" style={{ color: accentColor === '#b5e220' ? '#4a6600' : accentColor }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">{step.title}</h3>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{step.description}</p>

        {/* Tip callout */}
        {step.tip && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4"
            style={{
              background: `${accentColor}12`,
              border: `0.5px solid ${accentColor}40`,
            }}
          >
            <Sparkles
              className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
              style={{ color: accentColor === '#b5e220' ? '#4a6600' : accentColor }}
            />
            <p className="text-xs leading-relaxed" style={{ color: accentColor === '#b5e220' ? '#3a5500' : '#2d2f8a' }}>
              {step.tip}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 16 : 6,
                  height: 6,
                  background: i === index ? accentColor : i < index ? `${accentColor}60` : '#e5e7eb',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{
                background: accentColor,
                color: accentText,
              }}
            >
              {isLast ? 'Done' : 'Next'}
              {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Step label */}
      <div className="px-5 pb-3">
        <span className="text-[11px] text-gray-300 tracking-wider uppercase">
          Step {index + 1} of {total}
        </span>
      </div>
    </div>
  );
}

// ================== Role Selection Screen ==================
function RoleSelect({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        {/* Animated top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#b5e220] via-[#6366f1] to-[#b5e220]" style={{ backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#b5e220] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-[#1a2200]" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold leading-none mb-0.5">inVision</p>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold leading-none">University</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the admissions platform</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Select your role to get a personalized walkthrough with tips, deadlines, and document guidance.
          </p>

          {/* Role cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Applicant */}
            <button
              onClick={() => onSelect('applicant')}
              className="group text-left border border-gray-200 rounded-xl p-5 hover:border-[#b5e220] hover:bg-[#b5e220]/5 transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-[#b5e220]/15 flex items-center justify-center mb-4 group-hover:bg-[#b5e220]/25 transition-colors">
                <User className="w-5 h-5 text-[#4a6600]" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Applicant</p>
              <p className="text-xs text-gray-400 leading-relaxed">Submit your application and track your admission progress</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-[#4a6600] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Start tour <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            {/* Committee */}
            <button
              onClick={() => onSelect('committee')}
              className="group text-left border border-gray-200 rounded-xl p-5 hover:border-[#6366f1] hover:bg-[#6366f1]/5 transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center mb-4 group-hover:bg-[#6366f1]/20 transition-colors">
                <Users className="w-5 h-5 text-[#4338ca]" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Committee</p>
              <p className="text-xs text-gray-400 leading-relaxed">Review applications and manage the selection pipeline</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-[#4338ca] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Start tour <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>

          {/* Timeline preview */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">2025 Admission timeline</p>
            <div className="flex items-center gap-0">
              {[
                { label: 'Apply', date: 'Now', active: true },
                { label: 'Review', date: 'Jun', active: false },
                { label: 'Interview', date: 'Jul', active: false },
                { label: 'Decision', date: 'Aug', active: false },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-2 h-2 rounded-full mb-1 ${item.active ? 'bg-[#b5e220]' : 'bg-gray-200'}`} />
                    <p className={`text-[11px] font-medium ${item.active ? 'text-gray-800' : 'text-gray-400'}`}>{item.label}</p>
                    <p className="text-[10px] text-gray-300">{item.date}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="h-px bg-gray-100 flex-1 max-w-8 mb-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-gray-300 mt-4">You can replay this tour anytime from the help menu</p>
        </div>
      </div>
    </div>
  );
}

// ================== Main Onboarding Component ==================
export function OnboardingTour({ onComplete }: OnboardingProps) {
  const [role, setRole] = useState<Role>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(true);

  const steps = role === 'applicant' ? APPLICANT_STEPS : role === 'committee' ? COMMITTEE_STEPS : [];

  const currentStep = steps[stepIndex];

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll element into view
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!role || !isActive) return;
    // small delay to let scroll settle
    const t = setTimeout(measureTarget, 150);
    return () => clearTimeout(t);
  }, [role, stepIndex, measureTarget, isActive]);

  useEffect(() => {
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureTarget]);

  const handleSelectRole = (r: Role) => {
    setRole(r);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete(role);
  };

  if (!isActive) return null;

  return (
    <>
      {/* Role selection */}
      {!role && <RoleSelect onSelect={handleSelectRole} />}

      {/* Tour overlay */}
      {role && currentStep && (
        <>
          <HighlightBox rect={targetRect} />
          <TooltipCard
            step={currentStep}
            index={stepIndex}
            total={steps.length}
            rect={targetRect}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleComplete}
            role={role}
          />
        </>
      )}
    </>
  );
}

// ================== Hook to manage tour state ==================
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [completedRole, setCompletedRole] = useState<Role>(null);

  useEffect(() => {
    // Show tour on first visit
    const seen = localStorage.getItem('invision_tour_seen');
    if (!seen) {
      setShowTour(true);
    }
  }, []);

  const handleComplete = (role: Role) => {
    setCompletedRole(role);
    setShowTour(false);
    localStorage.setItem('invision_tour_seen', 'true');
  };

  const restartTour = () => {
    localStorage.removeItem('invision_tour_seen');
    setShowTour(true);
  };

  return { showTour, completedRole, handleComplete, restartTour };
}

// ================== Replay button (for navbar/help menu) ==================
export function TourReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors"
    >
      <Play className="w-3 h-3" />
      Replay tour
    </button>
  );
}