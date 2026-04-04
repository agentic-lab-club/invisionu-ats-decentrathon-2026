'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/CandidateNavbar';
import { useInterview } from './InterviewContext';
import {
  Mic, Video, Wifi, CheckCircle2, Circle,
  ChevronRight, AlertCircle, Clock, Shield,
  Sparkles, Volume2, Camera, MonitorCheck,
} from 'lucide-react';

type CheckStatus = 'idle' | 'checking' | 'ok' | 'error';

interface SystemCheck {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: CheckStatus;
}

const QUESTIONS_PREVIEW = [
  'Tell us about yourself and what motivates you to apply to inVision U.',
  'Describe a challenge you have overcome and what you learned from it.',
  'Where do you see yourself in 5 years, and how does this program help you get there?',
  'Give us an example of a time you demonstrated leadership or initiative.',
  'Why did you choose this specific program at inVision University?',
];

export default function InterviewIntroPage() {
  const { startCamera, camReady, camError, ttsSupported } = useInterview();

  const [checks, setChecks] = useState<SystemCheck[]>([
    { id: 'camera',     label: 'Camera',        description: 'Access to your webcam',      icon: Camera,       status: 'idle' },
    { id: 'microphone', label: 'Microphone',    description: 'Access to your microphone',  icon: Mic,          status: 'idle' },
    { id: 'audio',      label: 'Audio output',  description: 'Speakers or headphones',     icon: Volume2,      status: 'idle' },
    { id: 'network',    label: 'Connection',    description: 'Stable internet connection', icon: Wifi,         status: 'idle' },
    { id: 'browser',    label: 'Browser',       description: 'Browser API compatibility',  icon: MonitorCheck, status: 'idle' },
  ]);
  const [allPassed, setAllPassed] = useState(false);
  const [checking, setChecking]   = useState(false);
  const [agreed, setAgreed]       = useState(false);

  // Warm up camera as soon as the page loads (background, non-blocking)
  useEffect(() => {
    startCamera().catch(() => {});
  }, [startCamera]);

  // Mirror camera/mic status from context into checks UI
  useEffect(() => {
    if (camReady) {
      setChecks(prev => prev.map(c =>
        c.id === 'camera' || c.id === 'microphone' ? { ...c, status: 'ok' } : c
      ));
    }
    if (camError) {
      setChecks(prev => prev.map(c =>
        c.id === 'camera' || c.id === 'microphone' ? { ...c, status: 'error' } : c
      ));
    }
  }, [camReady, camError]);

  const updateCheck = (id: string, status: CheckStatus) =>
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));

  const runChecks = async () => {
    setChecking(true);

    updateCheck('camera', 'checking');
    updateCheck('microphone', 'checking');
    await delay(300);
    if (camReady) {
      updateCheck('camera', 'ok');
      updateCheck('microphone', 'ok');
    } else {
      await startCamera();
      await delay(200);
      const st = camReady ? 'ok' : 'error';
      updateCheck('camera', st);
      updateCheck('microphone', st);
    }

    updateCheck('audio', 'checking');
    await delay(200);
    try { const ac = new AudioContext(); await ac.close(); updateCheck('audio', 'ok'); }
    catch { updateCheck('audio', 'error'); }

    updateCheck('network', 'checking');
    await delay(300);
    updateCheck('network', navigator.onLine ? 'ok' : 'error');

    updateCheck('browser', 'checking');
    await delay(150);
    updateCheck('browser', !!(navigator.mediaDevices && window.MediaRecorder && ttsSupported) ? 'ok' : 'error');

    setChecking(false);
  };

  useEffect(() => {
    setAllPassed(checks.every(c => c.status === 'ok'));
  }, [checks]);

  const canStart = allPassed && agreed;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#b5e220] flex items-center justify-center">
                <span className="text-[10px] font-black text-gray-900">iU</span>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">inVision University</p>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mt-4">AI Interview</h1>
            <p className="text-sm text-gray-400 mt-1">Stage 0 — Video interview with our AI assistant</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-5">

              {/* Intro */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#b5e220]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-[#8aaa18]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Meet your AI interviewer</h2>
                    <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                      You will have a real-time conversation with our AI assistant —{' '}
                      <strong className="text-gray-600">AIYA</strong>. She will speak her questions aloud
                      and listen to your answers. Speak naturally, as if talking to a real interviewer.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Clock,  label: '10–15 min',   sub: 'Estimated duration' },
                    { icon: Video,  label: '5 questions', sub: 'Conversational format' },
                    { icon: Shield, label: 'Private',     sub: 'Secure & encrypted' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-center">
                      <Icon className="w-4 h-4 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
                {ttsSupported && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#b5e220]/8 border border-[#b5e220]/20">
                    <Volume2 className="w-3.5 h-3.5 text-[#8aaa18] flex-shrink-0" />
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">Voice enabled</span> — AIYA will speak
                      her questions aloud. Use headphones for the best experience.
                    </p>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">
                  Questions you may be asked
                </p>
                <div className="space-y-2.5">
                  {QUESTIONS_PREVIEW.map((q, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-600 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* System checks */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">System check</p>
                  <button
                    onClick={runChecks}
                    disabled={checking}
                    className="text-xs font-medium text-[#8aaa18] hover:text-[#6b8c14] disabled:opacity-50 transition-colors"
                  >
                    {checking ? 'Checking…' : 'Run checks'}
                  </button>
                </div>
                <div className="space-y-2.5">
                  {checks.map(({ id, label, description, icon: Icon, status }) => (
                    <div key={id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                      status === 'ok'       ? 'border-[#b5e220]/40 bg-[#b5e220]/5' :
                      status === 'error'    ? 'border-red-100 bg-red-50' :
                      status === 'checking' ? 'border-gray-200 bg-gray-50' :
                                             'border-gray-100 bg-white'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-3.5 h-3.5 ${
                          status === 'ok' ? 'text-[#8aaa18]' :
                          status === 'error' ? 'text-red-400' : 'text-gray-300'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{label}</p>
                          <p className="text-[11px] text-gray-400">{description}</p>
                        </div>
                      </div>
                      {status === 'idle'     && <Circle      className="w-4 h-4 text-gray-200" />}
                      {status === 'checking' && <div className="w-4 h-4 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />}
                      {status === 'ok'       && <CheckCircle2 className="w-4 h-4 text-[#8aaa18]" />}
                      {status === 'error'    && <AlertCircle  className="w-4 h-4 text-red-400" />}
                    </div>
                  ))}
                </div>
                {!camReady && !camError && checks.every(c => c.status === 'idle') && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3 h-3 border-2 border-gray-200 border-t-[#b5e220] rounded-full animate-spin" />
                    Warming up camera in background…
                  </div>
                )}
                {checks.some(c => c.status === 'error') && (
                  <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-500 leading-relaxed">
                      Some checks failed. Please grant browser permissions for camera and microphone, then run checks again.
                    </p>
                  </div>
                )}
              </div>

              {/* Consent + CTA */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <button
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className={`flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all mb-5 ${
                    agreed ? 'border-[#b5e220] bg-[#b5e220]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    agreed ? 'border-[#8aaa18] bg-[#b5e220]' : 'border-gray-300 bg-white'
                  }`}>
                    {agreed && (
                      <svg className="w-2.5 h-2.5 text-gray-800" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    I understand this interview will be recorded and processed by AI. I consent to the
                    recording and analysis of my video and audio responses for my inVision University application.
                    <span className="text-gray-300 ml-1">*</span>
                  </p>
                </button>

                <Link
                  href="/interview/session"
                  prefetch={true}
                  onClick={e => { if (!canStart) e.preventDefault(); }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    canStart
                      ? 'bg-[#b5e220] text-gray-900 hover:bg-[#a3cc1a] shadow-sm cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  Begin Interview
                  <ChevronRight className="w-4 h-4" />
                </Link>

                {!allPassed && checks.some(c => c.status !== 'idle') && (
                  <p className="text-[11px] text-gray-400 text-center mt-2">Complete all system checks to continue</p>
                )}
                {!allPassed && checks.every(c => c.status === 'idle') && (
                  <p className="text-[11px] text-gray-400 text-center mt-2">Run system checks above before starting</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">Tips for success</p>
                <div className="space-y-4">
                  {[
                    { emoji: '💡', tip: 'Find a quiet, well-lit space with a neutral background.' },
                    { emoji: '👁️', tip: 'Look directly into the camera when speaking.' },
                    { emoji: '🎙️', tip: 'Speak clearly and at a natural pace. Pauses are okay.' },
                    { emoji: '⏱️', tip: 'Aim for 60–90 seconds per answer — detailed but concise.' },
                    { emoji: '🧘', tip: 'Stay calm. AIYA is friendly and patient. Take your time.' },
                    { emoji: '🔇', tip: 'Mute notifications and close other browser tabs.' },
                  ].map(({ emoji, tip }) => (
                    <div key={tip} className="flex items-start gap-3">
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <p className="text-xs text-gray-500 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">What AIYA evaluates</p>
                  <div className="space-y-1.5">
                    {['Motivation & goal clarity', 'Leadership potential', 'Communication skills', 'Response structure'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#b5e220]" />
                        <p className="text-xs text-gray-500">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}