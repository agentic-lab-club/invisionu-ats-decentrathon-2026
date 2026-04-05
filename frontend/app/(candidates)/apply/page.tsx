'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, GraduationCap, ClipboardList,
  Clock, ChevronRight, FileText,
  Calendar, Video, BookOpen, Paperclip, IdCard,
  Send, AlertCircle, Loader2,
} from 'lucide-react';
import { OnboardingTour, useOnboarding, TourReplayButton } from '@/components/tours/Onboardingtour';
import { getAccessToken } from '@/lib/auth';
import { FileUploader } from '@/components/FileUploader';
import StatusBadge from '@/components/ui/StatusBadge';

// ================== Types =================
interface FormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  programCode: string;
  videoFileId: string;
  portfolioFileId: string;
  certificateFileId: string;
  englishResultFileId: string;
  consentDataProcessing: boolean;
  consentAge: boolean;
}

interface Option {
  id: string;
  key: string;
  text: string;
  order?: number;
}

interface Question {
  id: string;
  order: number;
  text: string;
  options: Option[];
}

// ================== Shared input style ==================
const inputWithIconClass =
  'w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all duration-150 appearance-none';

function IconInput({
  icon: Icon, ...props
}: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
      <input className={inputWithIconClass} {...props} />
    </div>
  );
}

function IconSelect({
  icon: Icon, children, ...props
}: { icon: React.ElementType } & React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
      <select className={`${inputWithIconClass} pr-8`} {...props}>
        {children}
      </select>
    </div>
  );
}

// ================== Field wrapper ==================
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
        {label}{required && <span className="text-gray-300 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionDivider({ icon: Icon, title, subtitle, optional }: {
  icon?: React.ElementType; title: string; subtitle?: string; optional?: boolean;
}) {
  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-300" />}
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
          {title}
          {optional && <span className="ml-2 normal-case tracking-normal text-gray-300 text-[11px]">(optional)</span>}
        </p>
      </div>
      {subtitle
        ? <p className="text-xs text-gray-400 mt-1 mb-4">{subtitle}</p>
        : <div className="mb-4" />
      }
    </div>
  );
}

// ================== Consent Block ==================
function ConsentBlock({
  consentDataProcessing, consentAge, onConsentDataProcessing, onConsentAge,
}: {
  consentDataProcessing: boolean; consentAge: boolean;
  onConsentDataProcessing: (v: boolean) => void; onConsentAge: (v: boolean) => void;
}) {
  const items = [
    {
      checked: consentDataProcessing, toggle: onConsentDataProcessing,
      text: (<>By submitting this form, you agree to the processing of your personal data in accordance with our{' '}
        <span className="text-[#8aaa18] underline underline-offset-2">Privacy Policy</span>
        <span className="text-gray-300 ml-1">*</span></>),
    },
    {
      checked: consentAge, toggle: onConsentAge,
      text: (<>If the participant is under the age of 18, this questionnaire must be completed by their parent or legal guardian.
        By proceeding, you confirm that you are either (a) the participant aged 18 or older, or (b) the parent or legal guardian completing this form on behalf of a minor.
        <span className="text-gray-300 ml-1">*</span></>),
    },
  ];

  return (
    <div data-tour="consents" className="pt-4 border-t border-gray-100 space-y-3 mt-2">
      {items.map((item, i) => (
        <button key={i} type="button" onClick={() => item.toggle(!item.checked)}
          className={`flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
            item.checked ? 'border-[#b5e220] bg-[#b5e220]/5' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            item.checked ? 'border-[#8aaa18] bg-[#b5e220]' : 'border-gray-300 bg-white'
          }`}>
            {item.checked && (
              <svg className="w-2.5 h-2.5 text-gray-800" fill="none" viewBox="0 0 10 10">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
        </button>
      ))}
    </div>
  );
}

// ================== Tab: Personal ==================
interface TabProps { data: FormData; updateField: (field: keyof FormData, value: any) => void; }

const PersonalInfoTab = ({ data, updateField }: TabProps) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="First name" required>
        <IconInput icon={User} type="text" value={data.firstName}
          onChange={e => updateField('firstName', e.target.value)} placeholder="Ivan" />
      </Field>
      <Field label="Last name" required>
        <IconInput icon={User} type="text" value={data.lastName}
          onChange={e => updateField('lastName', e.target.value)} placeholder="Ivanov" />
      </Field>
      <Field label="Phone number" required>
        <IconInput icon={Phone} type="tel" value={data.phoneNumber}
          onChange={e => updateField('phoneNumber', e.target.value)} placeholder="+7 (___) ___-__-__" />
      </Field>
      <Field label="Program" required>
        <IconSelect icon={GraduationCap} value={data.programCode}
          onChange={e => updateField('programCode', e.target.value)}>
          <option value="undergrad_society">Society (Sociology: Leadership and Innovation)</option>
          <option value="undergrad_art_media">Art + Media (Digital Media and Marketing)</option>
          <option value="undergrad_tech">Tech (Innovative IT Product Design and Development)</option>
          <option value="undergrad_policy_reform">Policy Reform (Public Policy and Development)</option>
          <option value="undergrad_engineering">Engineering (Creative Engineering)</option>
          <option value="foundation_year">Foundation Year</option>
        </IconSelect>
      </Field>
    </div>

    <div data-tour="video-upload" className="space-y-2">
      <FileUploader
        fileType="video_presentation"
        label="Video presentation"
        onFileIdReceived={(id) => updateField('videoFileId', id)}
        existingFileId={data.videoFileId}
        accept="video/*"
        hint="MP4, AVI, or MOV — up to 100 MB"
      />
    </div>

    <SectionDivider icon={FileText} title="Supporting documents" optional
      subtitle="Upload your portfolio, certificate, and English results." />

    <div data-tour="supporting-docs" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <FileUploader
        fileType="portfolio"
        label="Portfolio"
        onFileIdReceived={(id) => updateField('portfolioFileId', id)}
        existingFileId={data.portfolioFileId}
        accept="application/pdf"
        hint="PDF — up to 10 MB"
      />
      <FileUploader
        fileType="certificate"
        label="Certificate"
        onFileIdReceived={(id) => updateField('certificateFileId', id)}
        existingFileId={data.certificateFileId}
        accept="application/pdf,image/*"
        hint="UNT / SAT / NIS"
      />
      <FileUploader
        fileType="english_result"
        label="English results"
        onFileIdReceived={(id) => updateField('englishResultFileId', id)}
        existingFileId={data.englishResultFileId}
        accept="application/pdf,image/*"
        hint="IELTS / TOEFL / Duolingo"
      />
    </div>

    <ConsentBlock
      consentDataProcessing={data.consentDataProcessing}
      consentAge={data.consentAge}
      onConsentDataProcessing={v => updateField('consentDataProcessing', v)}
      onConsentAge={v => updateField('consentAge', v)}
    />
  </div>
);

// ================== Tab: Internal Test ==================
const InternalTestTab = ({
  questions,
  selectedOptionIds,
  onAnswer,
}: {
  questions: Question[];
  selectedOptionIds: string[];
  onAnswer: (questionIndex: number, optionId: string) => void;
}) => {
  const answered = selectedOptionIds.filter(id => id !== '').length;
  const total = questions.length;
  const pct = Math.round((answered / total) * 100);

  if (questions.length === 0) {
    return <div className="text-center py-8 text-gray-400">No personality test available.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">{answered} of {total} answered</p>
        <p className="text-sm font-medium text-gray-600">{pct}%</p>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-[#b5e220] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div data-tour="test-info" className="rounded-lg border border-gray-100 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Personality assessment</p>
        </div>
        <p className="text-sm text-gray-400 px-4 py-3 leading-relaxed">
          There are no right or wrong answers — we simply want to understand how you think.
        </p>
      </div>

      <div data-tour="test-questions" className="divide-y divide-gray-100">
        {questions.map((q, idx) => (
          <div key={q.id} className="py-5">
            <div className="flex gap-3 mb-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5 transition-colors ${
                selectedOptionIds[idx] ? 'bg-[#b5e220] text-gray-800' : 'bg-gray-100 text-gray-400'
              }`}>
                {q.order}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{q.text}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-9">
              {q.options.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                    selectedOptionIds[idx] === opt.id
                      ? 'border-[#b5e220] bg-[#b5e220]/10 text-gray-800 font-medium'
                      : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={opt.id}
                    checked={selectedOptionIds[idx] === opt.id}
                    onChange={() => onAnswer(idx, opt.id)}
                    className="hidden"
                  />
                  <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selectedOptionIds[idx] === opt.id ? 'border-[#8aaa18]' : 'border-gray-300'
                  }`}>
                    {selectedOptionIds[idx] === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-[#8aaa18]" />}
                  </span>
                  {opt.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================== Tab definitions ==================
const TABS = [
  { label: 'Personal',      icon: User },
  { label: 'Internal test', icon: ClipboardList },
];

// ================== Sidebar ==================
interface Stage {
  id?: string;
  name: string;
  order: number;
  isCompleted?: boolean;
  isCurrent?: boolean;
}
type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function ApplicationSidebar({ applicationId }: { applicationId?: string }) {
  const deadline = useMemo(() => new Date(2026, 4, 30, 23, 59, 59), []);
  const getTimeLeft = useCallback((): TimeLeft => {
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [deadline]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [getTimeLeft]);

  const getCurrentStatusKey = (): string => {
    if (!applicationId) return 'draft';
    return 'new';
  };

  const currentStatusKey = getCurrentStatusKey();

  const allStatuses = [
    { key: 'draft', label: 'Draft' },
    { key: 'new', label: 'New' },
    { key: 'review', label: 'Review' },
    { key: 'recommended', label: 'Recommended' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const documents = [
    { label: 'Passport / ID', icon: IdCard },
    { label: 'Video presentation', icon: Video },
    { label: 'English proficiency results', icon: BookOpen },
    { label: 'UNT / NIS certificate', icon: GraduationCap },
    { label: 'Engineering portfolio', icon: Paperclip },
  ];

  return (
    <div className="sticky top-24 space-y-6">
      {/* Deadline timer */}
      <div data-tour="sidebar-timer" className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-gray-300" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Time remaining</p>
        </div>
        <p className="text-3xl font-semibold text-gray-900 tabular-nums tracking-tight">
          {timeLeft.days}<span className="text-base font-normal text-gray-400 ml-0.5">d</span>&nbsp;
          {timeLeft.hours}<span className="text-base font-normal text-gray-400 ml-0.5">h</span>&nbsp;
          {timeLeft.minutes}<span className="text-base font-normal text-gray-400 ml-0.5">m</span>&nbsp;
          {timeLeft.seconds}<span className="text-base font-normal text-gray-400 ml-0.5">s</span>
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-300" />
          <p className="text-xs text-gray-400">Deadline: May 30, 2026</p>
        </div>
      </div>

      {/* Stages */}
      <div data-tour="sidebar-stages" className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">Stages</p>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
          <div className="space-y-3">
            {allStatuses.map((status, idx) => {
              const isActive = status.key === currentStatusKey;
              let circleStyle = 'bg-white border-gray-200';
              if (isActive) {
                circleStyle = 'bg-[#b5e220] border-[#b5e220]';
              } else if (idx === 0) {
                circleStyle = 'bg-white border-gray-200';
              } else {
                circleStyle = 'bg-white border-gray-100';
              }
              return (
                <div key={status.key} className="flex items-center gap-3 relative">
                  <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 z-10 ${circleStyle}`} />
                  <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {status.label}
                  </span>
                  {isActive && <ChevronRight className="w-3 h-3 text-gray-300 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Required documents */}
      <div data-tour="sidebar-docs" className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">Required documents</p>
        <div className="space-y-2.5">
          {documents.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================== Main Page ==================
export default function ApplyPage() {
  const { showTour, handleComplete, restartTour } = useOnboarding();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tabBarRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [loadingTest, setLoadingTest] = useState(true);
  const [testError, setTestError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', phoneNumber: '',
    programCode: 'undergrad_tech',
    videoFileId: '', portfolioFileId: '', certificateFileId: '', englishResultFileId: '',
    consentDataProcessing: false, consentAge: false,
  });

  const updateField = (field: keyof FormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleTabChange = (idx: number) => {
    setActiveTab(idx);
    formPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchTest = async () => {
      const token = getAccessToken();
      if (!token) { setLoadingTest(false); return; }
      try {
        const res = await fetch('/api/backend/tests/personality/current', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load test: ${res.status}`);
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setSelectedOptionIds(Array(data.questions.length).fill(''));
        } else if (data.test?.questions) {
          setQuestions(data.test.questions);
          setSelectedOptionIds(Array(data.test.questions.length).fill(''));
        } else {
          throw new Error('Invalid test data format');
        }
      } catch (err: any) {
        setTestError(err.message || 'Could not load personality test. Please refresh or contact support.');
      } finally {
        setLoadingTest(false);
      }
    };
    fetchTest();
  }, []);

  const handleAnswer = (questionIndex: number, optionId: string) => {
    const next = [...selectedOptionIds];
    next[questionIndex] = optionId;
    setSelectedOptionIds(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      setError('Please fill in first name, last name, and phone number.');
      setLoading(false);
      return;
    }
    if (!formData.videoFileId) {
      setError('Please upload a video presentation.');
      setLoading(false);
      return;
    }
    if (!formData.consentDataProcessing || !formData.consentAge) {
      setError('Please accept both consent statements before submitting.');
      setLoading(false);
      return;
    }
    if (questions.length === 0) {
      setError('Personality test not loaded. Please refresh and try again.');
      setLoading(false);
      return;
    }
    if (selectedOptionIds.some(id => id === '')) {
      setError('Please answer all personality test questions.');
      setLoading(false);
      return;
    }

    const personality_test_answers = questions.map((q, idx) => ({
      question_id: q.id,
      option_id: selectedOptionIds[idx],
    }));

    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone_number: formData.phoneNumber,
      program_code: formData.programCode,
      video_file_id: formData.videoFileId,
      ...(formData.portfolioFileId     && { portfolio_file_id:      formData.portfolioFileId }),
      ...(formData.certificateFileId   && { certificate_file_id:    formData.certificateFileId }),
      ...(formData.englishResultFileId && { english_result_file_id: formData.englishResultFileId }),
      personality_test_answers,
    };

    const token = getAccessToken();
    if (!token) {
      setError('You are not logged in. Please sign in before submitting.');
      setLoading(false);
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/backend/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError('Session expired. Please sign in again.');
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error(data?.error || data?.message || 'Submission error');
      router.push(`/status/${data.application_id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabProps: TabProps = { data: formData, updateField };

  if (loadingTest) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#b5e220]" />
        <span className="ml-2 text-gray-500">Loading personality test...</span>
      </div>
    );
  }

  if (testError) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">{testError}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-[80%] mx-auto py-10">
      {showTour && <OnboardingTour onComplete={handleComplete} />}

      {/* Header */}
      <div data-tour="header" className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">inVision U</p>
          <h1 className="text-xl font-semibold text-gray-900">Application</h1>
        </div>
        <div className="flex items-center gap-3">
          <TourReplayButton onClick={restartTour} />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#b5e220] text-gray-900 rounded-xl hover:bg-[#a3cc1a] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><Send className="w-4 h-4" /> Send Application</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          {/* Tab bar */}
          <div
            ref={tabBarRef}
            data-tour="tabs"
            className="flex border-b border-gray-100 overflow-x-auto sticky top-0 z-10 bg-white"
            style={{ scrollbarWidth: 'none' }}
          >
            {TABS.map(({ label, icon: Icon }, idx) => (
              <button
                key={idx}
                type="button"
                data-tour={idx === 0 ? 'tab-personal' : 'tab-test'}
                onClick={() => handleTabChange(idx)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all duration-150 ${
                  activeTab === idx
                    ? 'border-[#b5e220] text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === idx ? 'text-[#8aaa18]' : 'text-gray-300'}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Form panel */}
          <div ref={formPanelRef} className="p-6 sm:p-8 overflow-y-auto">
            {activeTab === 0 && <PersonalInfoTab {...tabProps} />}
            {activeTab === 1 && (
              <InternalTestTab
                questions={questions}
                selectedOptionIds={selectedOptionIds}
                onAnswer={handleAnswer}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div data-tour="sidebar" className="hidden lg:block">
          <ApplicationSidebar />
        </div>
      </div>
    </div>
  );
}