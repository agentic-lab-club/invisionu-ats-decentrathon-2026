'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, GraduationCap, ClipboardList, Heart,
  Upload, CheckCircle2, Clock, ChevronRight, FileText,
  Calendar, Globe, MapPin, Camera, Send, Hash,
  IdCard, Video, BookOpen, Paperclip, Users, AlertCircle,
  Loader2, Square, CheckSquare,
} from 'lucide-react';

// ================== Types ==================
interface FileWithData {
  name: string;
  type: string;
  data: string;
}

interface ParentInfo {
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
}

interface FormData {
  lastName: string;
  firstName: string;
  patronymic: string;
  dateOfBirth: string;
  gender: string;
  citizenship: string;
  iin: string;
  identityDocType: string;
  identityDocNo: string;
  identityDocAuthority: string;
  identityDocIssueDate: string;
  passportFile: FileWithData | null;
  country: string;
  region: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  mobilePhone: string;
  instagram: string;
  telegram: string;
  whatsapp: string;
  father: ParentInfo;
  mother: ParentInfo;
  guardian: ParentInfo;
  videoLink: string;
  englishExam: string;
  certificateType: string;
  portfolioFile: FileWithData | null;
  englishResultFile: FileWithData | null;
  certificateFile: FileWithData | null;
  additionalDocs: FileWithData[];
  testAnswers: string[];
  hasSocialStatusCertificate: boolean;
  socialStatusFile: FileWithData | null;
  fatherIncomeFile: FileWithData | null;
  motherIncomeFile: FileWithData | null;
  guardianIncomeFile: FileWithData | null;
  consentDataProcessing: boolean;
  consentAge: boolean;
  essayText: string;
}

// ================== Shared input style ==================
const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all duration-150 appearance-none';

const inputWithIconClass =
  'w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all duration-150 appearance-none';

// ================== Icon Input wrapper ==================
function IconInput({
  icon: Icon,
  ...props
}: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
      <input className={inputWithIconClass} {...props} />
    </div>
  );
}

function IconSelect({
  icon: Icon,
  children,
  ...props
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

// ================== File Upload ==================
function FileUpload({
  accept,
  onFileChange,
  existingFile,
  hint,
}: {
  accept: string;
  onFileChange: (file: FileWithData | null) => void;
  existingFile: FileWithData | null;
  hint?: string;
}) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      onFileChange({ name: file.name, type: file.type, data: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <label className="flex items-center gap-3 w-full border border-dashed border-gray-200 rounded-lg py-4 px-4 cursor-pointer hover:border-[#b5e220] hover:bg-[#b5e220]/5 transition-all duration-150 bg-white group">
      <input type="file" accept={accept} onChange={handleChange} className="hidden" />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${existingFile ? 'bg-emerald-50' : 'bg-gray-50 group-hover:bg-[#b5e220]/10'}`}>
        {existingFile
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <Upload className="w-4 h-4 text-gray-300 group-hover:text-[#8aaa18]" />
        }
      </div>
      <div className="min-w-0">
        <p className="text-sm truncate">
          {existingFile
            ? <span className="text-emerald-600 font-medium">{existingFile.name}</span>
            : <span className="text-gray-400">Click to upload or drag and drop</span>
          }
        </p>
        {hint && <p className="text-xs text-gray-300 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function MultiFileUpload({
  accept,
  onFilesChange,
  existingFiles,
  hint,
}: {
  accept: string;
  onFilesChange: (files: FileWithData[]) => void;
  existingFiles: FileWithData[];
  hint?: string;
}) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: FileWithData[] = [];
    let pending = files.length;
    if (!pending) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({ name: file.name, type: file.type, data: reader.result as string });
        if (--pending === 0) onFilesChange([...existingFiles, ...newFiles]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <label className="flex items-center gap-3 w-full border border-dashed border-gray-200 rounded-lg py-4 px-4 cursor-pointer hover:border-[#b5e220] hover:bg-[#b5e220]/5 transition-all duration-150 bg-white group">
      <input type="file" multiple accept={accept} onChange={handleChange} className="hidden" />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${existingFiles.length > 0 ? 'bg-emerald-50' : 'bg-gray-50 group-hover:bg-[#b5e220]/10'}`}>
        {existingFiles.length > 0
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <Paperclip className="w-4 h-4 text-gray-300 group-hover:text-[#8aaa18]" />
        }
      </div>
      <div>
        <p className="text-sm">
          {existingFiles.length > 0
            ? <span className="text-emerald-600 font-medium">{existingFiles.length} file(s) selected</span>
            : <span className="text-gray-400">Click to upload or drag and drop</span>
          }
        </p>
        {hint && <p className="text-xs text-gray-300 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

// ================== Field wrapper ==================
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
        {label}
        {required && <span className="text-gray-300 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionDivider({ icon: Icon, title, subtitle, optional }: { icon?: React.ElementType; title: string; subtitle?: string; optional?: boolean }) {
  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-300" />}
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
          {title}
          {optional && <span className="ml-2 normal-case tracking-normal text-gray-300 text-[11px]">(optional)</span>}
        </p>
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
    </div>
  );
}

// ================== Consent Block ==================
function ConsentBlock({
  consentDataProcessing,
  consentAge,
  onConsentDataProcessing,
  onConsentAge,
}: {
  consentDataProcessing: boolean;
  consentAge: boolean;
  onConsentDataProcessing: (v: boolean) => void;
  onConsentAge: (v: boolean) => void;
}) {
  return (
    <div className="pt-4 border-t border-gray-100 space-y-3 mt-2">
      <button
        type="button"
        onClick={() => onConsentDataProcessing(!consentDataProcessing)}
        className={`flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
          consentDataProcessing ? 'border-[#b5e220] bg-[#b5e220]/5' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          consentDataProcessing ? 'border-[#8aaa18] bg-[#b5e220]' : 'border-gray-300 bg-white'
        }`}>
          {consentDataProcessing && (
            <svg className="w-2.5 h-2.5 text-gray-800" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          By submitting this form, you agree to the processing of your personal data in accordance with our{' '}
          <span className="text-[#8aaa18] underline underline-offset-2 cursor-pointer">Privacy Policy</span>
          <span className="text-gray-300 ml-1">*</span>
        </p>
      </button>

      <button
        type="button"
        onClick={() => onConsentAge(!consentAge)}
        className={`flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
          consentAge ? 'border-[#b5e220] bg-[#b5e220]/5' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          consentAge ? 'border-[#8aaa18] bg-[#b5e220]' : 'border-gray-300 bg-white'
        }`}>
          {consentAge && (
            <svg className="w-2.5 h-2.5 text-gray-800" fill="none" viewBox="0 0 10 10">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          If the participant is under the age of 18, this questionnaire must be completed by their parent or legal guardian. By proceeding, you confirm that you are either (a) the participant aged 18 or older, or (b) the parent or legal guardian completing this form on behalf of a minor.
          <span className="text-gray-300 ml-1">*</span>
        </p>
      </button>
    </div>
  );
}

// ================== Tab props ==================
interface TabProps {
  data: FormData;
  updateField: (field: keyof FormData, value: any) => void;
  updateFile: (field: keyof FormData, file: FileWithData | null) => void;
  updateFiles: (field: 'additionalDocs', files: FileWithData[]) => void;
}

// ================== Tab: Personal ==================
const PersonalInfoTab = ({ data, updateField, updateFile }: TabProps) => {
  const updateParent = (parent: 'father' | 'mother' | 'guardian', key: keyof ParentInfo, value: string) => {
    updateField(parent, { ...data[parent], [key]: value });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Last name" required>
          <IconInput icon={User} type="text" value={data.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Иванов" />
        </Field>
        <Field label="First name" required>
          <IconInput icon={User} type="text" value={data.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Иван" />
        </Field>
        <Field label="Patronymic">
          <IconInput icon={User} type="text" value={data.patronymic} onChange={(e) => updateField('patronymic', e.target.value)} placeholder="Иванович" />
        </Field>
        <Field label="Date of birth" required>
          <IconInput icon={Calendar} type="date" value={data.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
        </Field>
      </div>

      <Field label="Gender" required>
        <div className="flex gap-4 py-1">
          {[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                data.gender === opt.value
                  ? 'border-[#b5e220] bg-[#b5e220]/10 text-gray-800 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={opt.value}
                checked={data.gender === opt.value}
                onChange={() => updateField('gender', opt.value)}
                className="hidden"
              />
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${data.gender === opt.value ? 'border-[#8aaa18]' : 'border-gray-300'}`}>
                {data.gender === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#8aaa18]" />}
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Citizenship" required>
          <IconSelect icon={Globe} value={data.citizenship} onChange={(e) => updateField('citizenship', e.target.value)}>
            <option value="Kazakhstan">Kazakhstan</option>
            <option value="other">Other</option>
          </IconSelect>
        </Field>
        <Field label="IIN" required>
          <IconInput icon={Hash} type="text" value={data.iin} onChange={(e) => updateField('iin', e.target.value)} placeholder="000000000000" maxLength={12} />
        </Field>
        <Field label="Document type" required>
          <IconSelect icon={IdCard} value={data.identityDocType} onChange={(e) => updateField('identityDocType', e.target.value)}>
            <option value="">Select</option>
            <option value="passport">Passport</option>
            <option value="id_card">ID card</option>
          </IconSelect>
        </Field>
        <Field label="Document number" required>
          <IconInput icon={Hash} type="text" value={data.identityDocNo} onChange={(e) => updateField('identityDocNo', e.target.value)} />
        </Field>
        <Field label="Issuing authority" required>
          <IconInput icon={FileText} type="text" value={data.identityDocAuthority} onChange={(e) => updateField('identityDocAuthority', e.target.value)} />
        </Field>
        <Field label="Issue date" required>
          <IconInput icon={Calendar} type="date" value={data.identityDocIssueDate} onChange={(e) => updateField('identityDocIssueDate', e.target.value)} />
        </Field>
      </div>

      <SectionDivider icon={IdCard} title="Passport copy *" />
      <FileUpload
        accept="image/jpeg,image/jpg,image/png,image/heic"
        onFileChange={(file) => updateFile('passportFile', file)}
        existingFile={data.passportFile}
        hint="JPG, PNG, HEIC — up to 10 MB"
      />

      {/* Parent Details */}
      <SectionDivider
        icon={Users}
        title="Parent details"
        subtitle="Please fill in your parents' personal details exactly as they appear on their government-issued ID"
      />

      {(
        [
          { key: 'father', label: 'Father' },
          { key: 'mother', label: 'Mother' },
          { key: 'guardian', label: 'Guardian' },
        ] as const
      ).map(({ key, label }) => (
        <div key={key} className="rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Last name">
              <IconInput
                icon={User}
                type="text"
                value={data[key].lastName}
                onChange={(e) => updateParent(key, 'lastName', e.target.value)}
                placeholder="Last name"
              />
            </Field>
            <Field label="First name">
              <IconInput
                icon={User}
                type="text"
                value={data[key].firstName}
                onChange={(e) => updateParent(key, 'firstName', e.target.value)}
                placeholder="First name"
              />
            </Field>
            <Field label="Patronymic">
              <IconInput
                icon={User}
                type="text"
                value={data[key].patronymic}
                onChange={(e) => updateParent(key, 'patronymic', e.target.value)}
                placeholder="Patronymic"
              />
            </Field>
            <Field label="Mobile phone number">
              <IconInput
                icon={Phone}
                type="tel"
                value={data[key].phone}
                onChange={(e) => updateParent(key, 'phone', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </Field>
          </div>
        </div>
      ))}

      <ConsentBlock
        consentDataProcessing={data.consentDataProcessing}
        consentAge={data.consentAge}
        onConsentDataProcessing={(v) => updateField('consentDataProcessing', v)}
        onConsentAge={(v) => updateField('consentAge', v)}
      />
    </div>
  );
};

// ================== Tab: Contact ==================
const ContactInfoTab = ({ data, updateField }: TabProps) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Country" required>
        <IconInput icon={Globe} type="text" value={data.country} onChange={(e) => updateField('country', e.target.value)} />
      </Field>
      <Field label="Region" required>
        <IconInput icon={MapPin} type="text" value={data.region} onChange={(e) => updateField('region', e.target.value)} />
      </Field>
      <Field label="City" required>
        <IconInput icon={MapPin} type="text" value={data.city} onChange={(e) => updateField('city', e.target.value)} />
      </Field>
      <Field label="Street" required>
        <IconInput icon={MapPin} type="text" value={data.street} onChange={(e) => updateField('street', e.target.value)} />
      </Field>
      <Field label="House" required>
        <IconInput icon={MapPin} type="text" value={data.house} onChange={(e) => updateField('house', e.target.value)} />
      </Field>
      <Field label="Apartment">
        <IconInput icon={MapPin} type="text" value={data.apartment} onChange={(e) => updateField('apartment', e.target.value)} />
      </Field>
    </div>

    <Field label="Mobile phone" required>
      <IconInput icon={Phone} type="tel" value={data.mobilePhone} onChange={(e) => updateField('mobilePhone', e.target.value)} placeholder="+7 (___) ___-__-__" />
    </Field>

    <SectionDivider icon={Users} title="Social media" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="Instagram">
        <IconInput icon={Camera} type="text" value={data.instagram} onChange={(e) => updateField('instagram', e.target.value)} placeholder="@username" />
      </Field>
      <Field label="Telegram">
        <IconInput icon={Send} type="text" value={data.telegram} onChange={(e) => updateField('telegram', e.target.value)} placeholder="@username" />
      </Field>
      <Field label="WhatsApp">
        <IconInput icon={Phone} type="tel" value={data.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} placeholder="+7..." />
      </Field>
    </div>
  </div>
);

// ================== Tab: Education ==================
const EducationTab = ({ data, updateField, updateFile, updateFiles }: TabProps) => (
  <div className="space-y-5">
    {/* Personal Presentation */}
    <div className="rounded-xl border border-gray-100 p-5 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Personal Presentation</p>
        <p className="text-xs text-gray-400">
          Please submit the link to your video presentation. For more information on how to create your video, see the instructions.
        </p>
      </div>
      <Field label="Link to your presentation" required>
        <IconInput icon={Video} type="url" value={data.videoLink} onChange={(e) => updateField('videoLink', e.target.value)} placeholder="https://youtube.com/..." />
      </Field>
    </div>

    {/* Portfolio */}
    <div className="rounded-xl border border-gray-100 p-5 space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Portfolio</p>
        <p className="text-xs text-gray-400">If you have a portfolio, you can upload it here.</p>
      </div>
      <Field label="Portfolio document">
        <FileUpload
          accept="application/pdf"
          onFileChange={(file) => updateFile('portfolioFile', file)}
          existingFile={data.portfolioFile}
          hint="Formats allowed: PDF. File size must be less than 10 MB."
        />
      </Field>
    </div>

    {/* English proficiency */}
    <div className="rounded-xl border border-gray-100 p-5 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">English proficiency results</p>
        <p className="text-xs text-gray-400">Please submit the results of your English proficiency test.</p>
      </div>
      <Field label="Exam" required>
        <IconInput icon={BookOpen} type="text" value={data.englishExam} onChange={(e) => updateField('englishExam', e.target.value)} placeholder="IELTS, TOEFL, Duolingo..." />
      </Field>
      <Field label="Copy of your results">
        <FileUpload
          accept="image/jpeg,image/jpg,image/png,image/heic,application/pdf"
          onFileChange={(file) => updateFile('englishResultFile', file)}
          existingFile={data.englishResultFile}
          hint="Formats allowed: JPG, JPEG, PNG, HEIC, PDF. File size must be less than 10 MB."
        />
      </Field>
    </div>

    {/* Certificate */}
    <div className="rounded-xl border border-gray-100 p-5 space-y-4">
      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Certificate</p>
      <Field label="Certificate type">
        <IconInput icon={FileText} type="text" value={data.certificateType} onChange={(e) => updateField('certificateType', e.target.value)} placeholder="UNT, SAT, NIS..." />
      </Field>
      <Field label="Copy of your certificate">
        <FileUpload
          accept="image/jpeg,image/jpg,image/png,image/heic,application/pdf"
          onFileChange={(file) => updateFile('certificateFile', file)}
          existingFile={data.certificateFile}
          hint="Formats allowed: JPG, JPEG, PNG, HEIC, PDF. File size must be less than 10 MB."
        />
      </Field>
    </div>

    {/* Additional documents */}
    <div className="rounded-xl border border-gray-100 p-5 space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Additional documents</p>
        <p className="text-xs text-gray-400">If you have any additional information about your educational background, you can upload it here.</p>
      </div>
      <Field label="Documents">
        <MultiFileUpload
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic"
          onFilesChange={(files) => updateFiles('additionalDocs', files)}
          existingFiles={data.additionalDocs}
          hint="Formats allowed: PDF, JPG, JPEG, PNG, HEIC. File size must be less than 10 MB."
        />
      </Field>
    </div>

    <ConsentBlock
      consentDataProcessing={data.consentDataProcessing}
      consentAge={data.consentAge}
      onConsentDataProcessing={(v) => updateField('consentDataProcessing', v)}
      onConsentAge={(v) => updateField('consentAge', v)}
    />
  </div>
);

// ================== Tab: Internal Test ==================
const BASE_QUESTIONS = [
  'I prefer working on well-defined problems rather than ambiguous ones.',
  'When facing a setback, I quickly look for alternative approaches.',
  'I find it energizing to lead a group toward a shared goal.',
  'I tend to think in systems and enjoy seeing how parts connect.',
  'I am comfortable presenting my ideas to people I have just met.',
  "I enjoy iterating on a solution many times before I'm satisfied.",
  'I prefer depth in one area over breadth across many subjects.',
  'I often notice inefficiencies in processes and want to fix them.',
  'Working under tight deadlines brings out the best in me.',
  'I seek feedback early, even when my work is incomplete.',
];
const ALL_QUESTIONS = Array(4).fill(BASE_QUESTIONS).flat() as string[];
const TEST_OPTIONS = [
  { value: 'a', label: 'Strongly agree' },
  { value: 'b', label: 'Agree' },
  { value: 'c', label: 'Disagree' },
  { value: 'd', label: 'Strongly disagree' },
];

const InternalTestTab = ({ data, updateField }: TabProps) => {
  const answered = data.testAnswers.filter(Boolean).length;
  const total = ALL_QUESTIONS.length;
  const pct = Math.round((answered / total) * 100);

  const handleAnswer = (index: number, value: string) => {
    const next = [...data.testAnswers];
    next[index] = value;
    updateField('testAnswers', next);
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">
          {answered} of {total} answered
        </p>
        <p className="text-sm font-medium text-gray-600">{pct}%</p>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-[#b5e220] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="rounded-lg border border-gray-100 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Personality assessment</p>
        </div>
        <p className="text-sm text-gray-400 px-4 py-3 leading-relaxed">
          There are no right or wrong answers — we simply want to understand how you think.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {ALL_QUESTIONS.map((question, idx) => (
          <div key={idx} className="py-5">
            <div className="flex gap-3 mb-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5 transition-colors ${
                data.testAnswers[idx] ? 'bg-[#b5e220] text-gray-800' : 'bg-gray-100 text-gray-400'
              }`}>
                {idx + 1}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{question}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-9">
              {TEST_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                    data.testAnswers[idx] === opt.value
                      ? 'border-[#b5e220] bg-[#b5e220]/10 text-gray-800 font-medium'
                      : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={opt.value}
                    checked={data.testAnswers[idx] === opt.value}
                    onChange={() => handleAnswer(idx, opt.value)}
                    className="hidden"
                  />
                  <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    data.testAnswers[idx] === opt.value ? 'border-[#8aaa18]' : 'border-gray-300'
                  }`}>
                    {data.testAnswers[idx] === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#8aaa18]" />}
                  </span>
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================== Tab: Social Status ==================
const SocialStatusTab = ({ data, updateField, updateFile }: TabProps) => (
  <div className="space-y-5">
    {/* Toggle */}
    <button
      type="button"
      onClick={() => updateField('hasSocialStatusCertificate', !data.hasSocialStatusCertificate)}
      className={`flex items-center gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
        data.hasSocialStatusCertificate
          ? 'border-[#b5e220] bg-[#b5e220]/5'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div
        className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${
          data.hasSocialStatusCertificate ? 'bg-[#b5e220]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            data.hasSocialStatusCertificate ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">Do you have a certificate of social status?</p>
        <p className="text-xs text-gray-400 mt-0.5">Orphan, large family, disability, etc.</p>
      </div>
    </button>

    {data.hasSocialStatusCertificate && (
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <p className="text-xs text-gray-400">You can submit it here.</p>
        <Field label="Document">
          <FileUpload
            accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic"
            onFileChange={(file) => updateFile('socialStatusFile', file)}
            existingFile={data.socialStatusFile}
            hint="Formats allowed: PDF, JPG, JPEG, PNG, HEIC. File size must be less than 10 MB."
          />
        </Field>
      </div>
    )}

    {/* Income section */}
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-3.5 h-3.5 text-gray-300" />
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Additional information</p>
      </div>
      <p className="text-xs text-gray-400 mb-4">Parents' income <span className="text-gray-300">(optional)</span></p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(
          [
            { label: 'Father', field: 'fatherIncomeFile', hint: "Certificate of father's income" },
            { label: 'Mother', field: 'motherIncomeFile', hint: "Certificate of mother's income" },
            { label: 'Guardian', field: 'guardianIncomeFile', hint: "Certificate of guardian's income" },
          ] as const
        ).map(({ label, field, hint }) => (
          <div key={field} className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{label}</p>
            <FileUpload
              accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic"
              onFileChange={(file) => updateFile(field, file)}
              existingFile={data[field]}
              hint="JPG, JPEG, PNG, HEIC, PDF. Up to 10 MB."
            />
          </div>
        ))}
      </div>
    </div>

    <ConsentBlock
      consentDataProcessing={data.consentDataProcessing}
      consentAge={data.consentAge}
      onConsentDataProcessing={(v) => updateField('consentDataProcessing', v)}
      onConsentAge={(v) => updateField('consentAge', v)}
    />
  </div>
);

// ================== Tab definitions ==================
const TABS = [
  { label: 'Personal',      icon: User },
  { label: 'Contact',       icon: Phone },
  { label: 'Education',     icon: GraduationCap },
  { label: 'Internal test', icon: ClipboardList },
  { label: 'Social status', icon: Heart },
];

// ================== Sidebar ==================
function ApplicationSidebar() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const deadline = new Date(2025, 4, 30, 23, 59, 59);

  useEffect(() => {
    const update = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { name: 'Application stage', active: true },
    { name: 'Initial screening', active: false },
    { name: 'Application review', active: false },
    { name: 'Interview', active: false },
    { name: 'Committee review', active: false },
    { name: 'Decision', active: false },
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
      {/* Timer card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-gray-300" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Time remaining</p>
        </div>
        <p className="text-3xl font-semibold text-gray-900 tabular-nums tracking-tight">
          {timeLeft.days}<span className="text-base font-normal text-gray-400 ml-0.5">d</span>&nbsp;
          {timeLeft.hours}<span className="text-base font-normal text-gray-400 ml-0.5">h</span>&nbsp;
          {timeLeft.minutes}<span className="text-base font-normal text-gray-400 ml-0.5">m</span>
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-300" />
          <p className="text-xs text-gray-400">Deadline: May 30, 2025</p>
        </div>
      </div>

      {/* Stages */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">Stages</p>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
          <div className="space-y-3">
            {stages.map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-3 relative">
                <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 z-10 ${
                  stage.active
                    ? 'bg-[#b5e220] border-[#b5e220]'
                    : i === 1
                    ? 'bg-white border-gray-200'
                    : 'bg-white border-gray-100'
                }`} />
                <span className={`text-sm ${stage.active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {stage.name}
                </span>
                {stage.active && <ChevronRight className="w-3 h-3 text-gray-300 ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tabBarRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    lastName: '', firstName: '', patronymic: '', dateOfBirth: '', gender: '', citizenship: 'Kazakhstan',
    iin: '', identityDocType: '', identityDocNo: '', identityDocAuthority: '', identityDocIssueDate: '',
    passportFile: null,
    country: 'Kazakhstan', region: '', city: '', street: '', house: '', apartment: '',
    mobilePhone: '', instagram: '', telegram: '', whatsapp: '',
    father: { lastName: '', firstName: '', patronymic: '', phone: '' },
    mother: { lastName: '', firstName: '', patronymic: '', phone: '' },
    guardian: { lastName: '', firstName: '', patronymic: '', phone: '' },
    videoLink: '', englishExam: '', certificateType: '',
    portfolioFile: null, englishResultFile: null, certificateFile: null,
    additionalDocs: [],
    testAnswers: Array(40).fill(''),
    hasSocialStatusCertificate: false, socialStatusFile: null,
    fatherIncomeFile: null, motherIncomeFile: null, guardianIncomeFile: null,
    consentDataProcessing: false, consentAge: false,
    essayText: '',
  });

  const updateField = (field: keyof FormData, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const updateFile = (field: keyof FormData, file: FileWithData | null) =>
    setFormData((prev) => ({ ...prev, [field]: file }));
  const updateFiles = (field: 'additionalDocs', files: FileWithData[]) =>
    setFormData((prev) => ({ ...prev, [field]: files }));

  const handleTabChange = (idx: number) => {
    setActiveTab(idx);
    // Scroll form panel to top on tab change
    if (formPanelRef.current) {
      formPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

const handleSubmit = async () => {
  console.log('=== handleSubmit called ===');
  console.log('formData', formData);
  setLoading(true);
  setError('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  console.log('API_URL:', API_URL);  // теперь будет работать

  // Валидация
  if (
    !formData.lastName || !formData.firstName || !formData.dateOfBirth || !formData.gender ||
    !formData.iin || !formData.identityDocType || !formData.identityDocNo ||
    !formData.identityDocAuthority || !formData.identityDocIssueDate || !formData.passportFile ||
    !formData.mobilePhone || !formData.videoLink || !formData.englishExam ||
    !formData.consentDataProcessing || !formData.consentAge
  ) {
    setError('Please fill in all required fields before submitting.');
    setLoading(false);
    return;
  }

  // Подготовка payload: разворачиваем родителей и убираем вложенные объекты
  const payload = {
    ...formData,
    fatherLastName: formData.father.lastName,
    fatherFirstName: formData.father.firstName,
    fatherPatronymic: formData.father.patronymic,
    fatherPhone: formData.father.phone,
    motherLastName: formData.mother.lastName,
    motherFirstName: formData.mother.firstName,
    motherPatronymic: formData.mother.patronymic,
    motherPhone: formData.mother.phone,
    guardianLastName: formData.guardian.lastName,
    guardianFirstName: formData.guardian.firstName,
    guardianPatronymic: formData.guardian.patronymic,
    guardianPhone: formData.guardian.phone,
    // удаляем вложенные объекты, чтобы не мешали десериализации в Go
    father: undefined,
    mother: undefined,
    guardian: undefined,
  };

  try {
    const res = await fetch(`${API_URL}/api/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission error');
    router.push(`/status/${data.candidateId}`);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const tabProps: TabProps = { data: formData, updateField, updateFile, updateFiles };
  return (
    <div className="w-[80%] mx-auto py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            inVision U
          </p>
          <h1 className="text-xl font-semibold text-gray-900">Application</h1>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#b5e220] text-gray-900 rounded-xl hover:bg-[#a3cc1a] disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            : <><Send className="w-4 h-4" /> Send Application</>
          }
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
        {/* Form panel */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          {/* ── Fixed tab bar ── */}
          <div
            ref={tabBarRef}
            className="flex border-b border-gray-100 overflow-x-auto sticky top-0 z-10 bg-white"
            style={{ scrollbarWidth: 'none' }}
          >
            {TABS.map(({ label, icon: Icon }, idx) => (
              <button
                key={idx}
                type="button"
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

          {/* Scrollable content area */}
          <div ref={formPanelRef} className="p-6 sm:p-8 overflow-y-auto">
            {activeTab === 0 && <PersonalInfoTab {...tabProps} />}
            {activeTab === 1 && <ContactInfoTab {...tabProps} />}
            {activeTab === 2 && <EducationTab {...tabProps} />}
            {activeTab === 3 && <InternalTestTab {...tabProps} />}
            {activeTab === 4 && <SocialStatusTab {...tabProps} />}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <ApplicationSidebar />
        </div>
      </div>
    </div>
  );
}