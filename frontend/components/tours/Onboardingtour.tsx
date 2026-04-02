'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Users, X, ChevronRight, ChevronLeft,
  FileText, BookOpen, CheckCircle2,
  Clock, Sparkles, GraduationCap, ClipboardList,
  ArrowRight, Play, Send, Video,
} from 'lucide-react';

// ================== Types ==================
type Role = 'applicant' | 'committee' | null;

interface TooltipStep {
  target: string;           // CSS selector of element to highlight
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  // если шаг требует переключить таб — указываем его индекс
  requireTab?: number;
}

interface OnboardingProps {
  onComplete: (role: Role) => void;
}

// ================== Step definitions ==================
// Все data-tour атрибуты соответствуют разметке в ApplyPage
const APPLICANT_STEPS: TooltipStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Welcome to your application',
    description: 'This is the application form for inVision University. Fill in all required fields across both tabs and hit "Send Application" when you\'re ready.',
    icon: Sparkles,
    tip: 'Deadline: May 30, 2026. You can save progress and return later.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tabs"]',
    title: 'Two sections to complete',
    description: 'The form has two tabs: "Personal" for your info and documents, and "Internal test" for the personality assessment. Both must be completed before submitting.',
    icon: ClipboardList,
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-personal"]',
    title: 'Start here — Personal tab',
    description: 'Click this tab to fill in your first name, last name, phone number, and choose your program. These fields are required.',
    icon: User,
    position: 'bottom',
    requireTab: 0,
  },
  {
    target: '[data-tour="video-upload"]',
    title: 'Upload your video presentation',
    description: 'Record a short video introducing yourself and upload it here. Accepted formats: MP4, AVI, MOV — up to 100 MB. This is required.',
    icon: Video,
    tip: 'Keep it 2–3 minutes. Tell us who you are and why you\'re applying.',
    position: 'bottom',
    requireTab: 0,
  },
  {
    target: '[data-tour="supporting-docs"]',
    title: 'Supporting documents (optional)',
    description: 'Upload your portfolio (PDF), school certificate (UNT/SAT/NIS), and English proficiency results (IELTS/TOEFL/Duolingo). These are optional but strengthen your application.',
    icon: FileText,
    tip: 'IELTS 6.0+, TOEFL 80+, or Duolingo 110+ are accepted.',
    position: 'bottom',
    requireTab: 0,
  },
  {
    target: '[data-tour="consents"]',
    title: 'Confirm before submitting',
    description: 'Tick both consent checkboxes at the bottom of the Personal tab. The form won\'t submit without them.',
    icon: CheckCircle2,
    position: 'top',
    requireTab: 0,
  },
  {
    target: '[data-tour="tab-test"]',
    title: 'Internal test — personality assessment',
    description: 'Click this tab to open the personality test. There are no right or wrong answers — answer honestly based on how you actually think and behave.',
    icon: ClipboardList,
    position: 'bottom',
    requireTab: 1,
  },
  {
    target: '[data-tour="test-info"]',
    title: 'Read the instructions first',
    description: 'Before answering, read the description at the top. The test helps us understand your thinking style — it doesn\'t affect your score directly.',
    icon: BookOpen,
    position: 'bottom',
    requireTab: 1,
  },
  {
    target: '[data-tour="test-questions"]',
    title: 'Answer all questions',
    description: 'Select one option per question. The progress bar at the top shows how many you\'ve answered. All questions must be answered before you can submit.',
    icon: ClipboardList,
    tip: 'Take your time — you can scroll up and change an answer at any point.',
    position: 'top',
    requireTab: 1,
  },
  {
    target: '[data-tour="sidebar-timer"]',
    title: 'Deadline countdown',
    description: 'The sidebar shows exactly how much time is left until the application deadline. Submit before the timer hits zero.',
    icon: Clock,
    position: 'left',
    requireTab: 0,
  },
  {
    target: '[data-tour="sidebar-docs"]',
    title: 'Required documents checklist',
    description: 'This list shows all documents you may need. Make sure you have them ready before you start uploading.',
    icon: FileText,
    tip: 'Prepare scanned copies or photos in advance to save time.',
    position: 'left',
    requireTab: 0,
  },
];

const COMMITTEE_STEPS: TooltipStep[] = [
  {
    target: '[data-tour="header"]',
    title: 'Committee review view',
    description: 'From this panel you can review candidate applications, check submitted documents, and track where each applicant is in the pipeline.',
    icon: Users,
    tip: 'All review actions are logged with your reviewer ID and timestamp.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tabs"]',
    title: 'Application sections',
    description: 'Each tab represents a section of the candidate\'s application. Review "Personal" for their info and uploads, then "Internal test" to see their personality assessment answers.',
    icon: ClipboardList,
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-personal"]',
    title: 'Personal information',
    description: 'Check the candidate\'s name, phone number, selected program, and uploaded video presentation. Flag anything that looks incomplete or suspicious.',
    icon: User,
    position: 'bottom',
    requireTab: 0,
  },
  {
    target: '[data-tour="supporting-docs"]',
    title: 'Uploaded supporting documents',
    description: 'Portfolio, certificate, and English results appear here. Verify each one. Missing documents should be flagged for follow-up before moving to the next stage.',
    icon: FileText,
    tip: 'You can add internal notes visible only to committee members.',
    position: 'bottom',
    requireTab: 0,
  },
  {
    target: '[data-tour="tab-test"]',
    title: 'Personality test answers',
    description: 'Switch to this tab to view the candidate\'s personality test responses. Use these alongside other signals — they\'re not a pass/fail measure.',
    icon: ClipboardList,
    position: 'bottom',
    requireTab: 1,
  },
  {
    target: '[data-tour="sidebar-stages"]',
    title: 'Application pipeline stages',
    description: 'The sidebar shows where this candidate sits: Draft → New → Review → Recommended → Rejected. You can advance or revert their stage from the candidate list view.',
    icon: CheckCircle2,
    position: 'left',
    requireTab: 0,
  },
  {
    target: '[data-tour="sidebar-docs"]',
    title: 'Required documents reference',
    description: 'Cross-check uploaded files against this list. Incomplete document sets automatically flag the candidate as requiring follow-up.',
    icon: FileText,
    tip: 'Batch-verify documents from the candidate list view to save time.',
    position: 'left',
    requireTab: 0,
  },
];

// ================== Highlight overlay ==================
function HighlightBox({ rect, padding = 8 }: { rect: DOMRect | null; padding?: number }) {
  if (!rect) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="cutout">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding} y={rect.top - padding}
              width={rect.width + padding * 2} height={rect.height + padding * 2}
              rx="10" fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#cutout)" />
        <rect
          x={rect.left - padding} y={rect.top - padding}
          width={rect.width + padding * 2} height={rect.height + padding * 2}
          rx="10" fill="none" stroke="#b5e220" strokeWidth="2" opacity="0.9"
        />
      </svg>
    </div>
  );
}

// ================== Tooltip card ==================
function TooltipCard({
  step, index, total, rect, onNext, onPrev, onSkip, role,
}: {
  step: TooltipStep; index: number; total: number; rect: DOMRect | null;
  onNext: () => void; onPrev: () => void; onSkip: () => void; role: Role;
}) {
  const Icon = step.icon;
  const isLast = index === total - 1;
  const accentColor = role === 'committee' ? '#6366f1' : '#b5e220';
  const accentText = role === 'committee' ? '#2d2f8a' : '#1a2200';
  const iconColor = role === 'committee' ? '#4338ca' : '#4a6600';

  const getStyle = (): React.CSSProperties => {
    const tooltipW = 360;
    const pad = 16;

    if (!rect || step.position === 'center') {
      return {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 9999, width: tooltipW,
      };
    }

    const pos = step.position ?? 'bottom';
    const safeLeft = (x: number) => Math.max(16, Math.min(x, window.innerWidth - tooltipW - 16));
    const safeTop  = (y: number) => Math.max(16, y);

    if (pos === 'bottom') return { position: 'fixed', top: safeTop(rect.bottom + pad), left: safeLeft(rect.left), zIndex: 9999, width: tooltipW };
    if (pos === 'top')    return { position: 'fixed', bottom: window.innerHeight - rect.top + pad, left: safeLeft(rect.left), zIndex: 9999, width: tooltipW };
    if (pos === 'left')   return { position: 'fixed', top: safeTop(rect.top), right: window.innerWidth - rect.left + pad, zIndex: 9999, width: tooltipW };
    if (pos === 'right')  return { position: 'fixed', top: safeTop(rect.top), left: rect.right + pad, zIndex: 9999, width: tooltipW };
    return { position: 'fixed', top: 100, left: 100, zIndex: 9999, width: tooltipW };
  };

  return (
    <div style={getStyle()} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{ width: `${((index + 1) / total) * 100}%`, background: accentColor }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}20` }}>
              <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">{step.title}</h3>
          </div>
          <button onClick={onSkip} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{step.description}</p>

        {/* Tip */}
        {step.tip && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4"
            style={{ background: `${accentColor}12`, border: `0.5px solid ${accentColor}40` }}>
            <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
            <p className="text-xs leading-relaxed" style={{ color: iconColor }}>{step.tip}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className="rounded-full transition-all duration-300" style={{
                width: i === index ? 16 : 6, height: 6,
                background: i === index ? accentColor : i < index ? `${accentColor}60` : '#e5e7eb',
              }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button onClick={onNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: accentColor, color: accentText }}>
              {isLast ? 'Done' : 'Next'}
              {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#b5e220] via-[#6366f1] to-[#b5e220]" />

        <div className="p-8">
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
            Select your role to get a guided walkthrough of the application process.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => onSelect('applicant')}
              className="group text-left border border-gray-200 rounded-xl p-5 hover:border-[#b5e220] hover:bg-[#b5e220]/5 transition-all duration-150">
              <div className="w-10 h-10 rounded-xl bg-[#b5e220]/15 flex items-center justify-center mb-4 group-hover:bg-[#b5e220]/25 transition-colors">
                <User className="w-5 h-5 text-[#4a6600]" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Applicant</p>
              <p className="text-xs text-gray-400 leading-relaxed">Submit your application and track your admission progress</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-[#4a6600] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Start tour <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button onClick={() => onSelect('committee')}
              className="group text-left border border-gray-200 rounded-xl p-5 hover:border-[#6366f1] hover:bg-[#6366f1]/5 transition-all duration-150">
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

          {/* Timeline */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">2026 Admission timeline</p>
            <div className="flex items-center">
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
                  {i < arr.length - 1 && <div className="h-px bg-gray-100 flex-1 max-w-8 mb-4" />}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-gray-300 mt-4">You can replay this tour anytime via "Replay tour"</p>
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

  // Switch the active tab in ApplyPage by clicking the matching data-tour tab button
  const switchToTab = useCallback((tabIndex: number) => {
    const tabSelector = tabIndex === 0 ? '[data-tour="tab-personal"]' : '[data-tour="tab-test"]';
    const tabEl = document.querySelector<HTMLButtonElement>(tabSelector);
    if (tabEl) tabEl.click();
  }, []);

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 200);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!role || !isActive || !currentStep) return;

    // Switch tab first if needed, then measure
    if (currentStep.requireTab !== undefined) {
      switchToTab(currentStep.requireTab);
      const t = setTimeout(measureTarget, 350); // wait for tab content to render
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(measureTarget, 150);
      return () => clearTimeout(t);
    }
  }, [role, stepIndex, measureTarget, isActive, currentStep, switchToTab]);

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
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete(role);
  };

  if (!isActive) return null;

  return (
    <>
      {!role && <RoleSelect onSelect={handleSelectRole} />}
      {role && currentStep && (
        <>
          <HighlightBox rect={targetRect} />
          <TooltipCard
            step={currentStep} index={stepIndex} total={steps.length}
            rect={targetRect} onNext={handleNext} onPrev={handlePrev}
            onSkip={handleComplete} role={role}
          />
        </>
      )}
    </>
  );
}

// ================== Hook ==================
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [completedRole, setCompletedRole] = useState<Role>(null);

  useEffect(() => {
    const seen = localStorage.getItem('invision_tour_seen');
    if (!seen) setShowTour(true);
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

// ================== Replay button ==================
export function TourReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors">
      <Play className="w-3 h-3" />
      Replay tour
    </button>
  );
}