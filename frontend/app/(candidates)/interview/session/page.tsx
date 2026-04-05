'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInterview, type InterviewScore } from '../InterviewContext';
import {
  Mic, MicOff, Video, VideoOff, Phone,
  ChevronRight, Loader2, AlertCircle,
  CheckCircle2, Clock, Volume2, VolumeX,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'init'        // waiting for API session to load
  | 'connecting'  // camera attaching
  | 'greeting'    // AIYA introduces herself
  | 'question'    // AIYA asks a question
  | 'recording'   // user is answering
  | 'saving'      // POST /answers in flight
  | 'transition'  // brief pause between questions
  | 'completing'  // POST /complete in flight
  | 'completed'   // all done, score ready
  | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const GREETING =
  "Hello! I'm AIYA, your AI interviewer from inVision University. " +
  "I'm so glad you're here today. We'll go through five questions — take your " +
  "time, speak naturally, and don't worry about being perfect. Ready? Let's begin!";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── AIYA Avatar ───────────────────────────────────────────────────────────────

function AIYAAvatar({ speaking, phase }: { speaking: boolean; phase: Phase }) {
  const isActive    = speaking;
  const isListening = phase === 'recording';

  return (
    <div className="relative flex items-center justify-center w-full h-full select-none">
      <div className="absolute rounded-full transition-all duration-700"
        style={{
          width: isActive ? '320px' : '260px', height: isActive ? '320px' : '260px',
          border: '1.5px solid rgba(181,226,32,0.25)',
          animation: isActive ? 'aRing 2.2s ease-in-out infinite' : 'none',
        }} />
      <div className="absolute rounded-full transition-all duration-700"
        style={{
          width: isListening ? '290px' : '240px', height: isListening ? '290px' : '240px',
          border: '1.5px solid rgba(181,226,32,0.15)',
          animation: isListening ? 'aRing 1.6s ease-in-out infinite 0.4s' : 'none',
        }} />

      <div className="relative z-10 flex flex-col items-center"
        style={{ animation: 'aFloat 4s ease-in-out infinite' }}>
        <div style={{ filter: 'drop-shadow(0 16px 40px rgba(181,226,32,0.18)) drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
          {/* Shoulders */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[58%] w-[136px] h-[76px] rounded-t-full"
            style={{ background: 'linear-gradient(180deg, #f0e6da 0%, #ddd0c0 100%)' }} />
          {/* Face */}
          <div className="relative overflow-hidden"
            style={{
              width: '172px', height: '172px', borderRadius: '50%',
              background: 'radial-gradient(ellipse at 38% 32%, #fdf0e4 0%, #f0d9c0 45%, #dfc4a0 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10), inset 0 2px 6px rgba(255,255,255,0.5), 0 0 0 3px rgba(255,255,255,0.8)',
            }}>
            {/* Hair */}
            <div className="absolute top-0 left-0 right-0" style={{ height: '58px', background: 'linear-gradient(180deg, #3d2510 0%, #5a3820 100%)', borderRadius: '86px 86px 0 0' }} />
            <div className="absolute top-0" style={{ width: '18px', height: '70%', left: 0, background: 'linear-gradient(180deg, #3d2510 0%, #5a3820 55%, transparent 100%)' }} />
            <div className="absolute top-0" style={{ width: '18px', height: '70%', right: 0, background: 'linear-gradient(180deg, #3d2510 0%, #5a3820 55%, transparent 100%)' }} />
            {/* Eyes */}
            <div className="absolute flex gap-7" style={{ top: '70px', left: '50%', transform: 'translateX(-50%)' }}>
              {[0, 1].map(i => (
                <div key={i} className="relative">
                  <div className="absolute rounded-full" style={{ width: '26px', height: '2.5px', background: '#3d2510', top: '-9px', left: '2px', transform: isActive ? 'rotate(-4deg) translateY(-1px)' : 'rotate(0deg)', transition: 'transform 0.4s ease' }} />
                  <div className="rounded-full bg-white flex items-center justify-center" style={{ width: '30px', height: '30px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div className="rounded-full flex items-center justify-center relative" style={{ width: '19px', height: '19px', background: '#5c3d2a', animation: isActive ? `aBlink 3.5s ease-in-out infinite ${i * 0.12}s` : 'none' }}>
                      <div className="rounded-full bg-gray-900" style={{ width: '10px', height: '10px' }} />
                      <div className="absolute rounded-full bg-white" style={{ width: '5px', height: '5px', top: '3px', right: '3px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Nose */}
            <div className="absolute rounded-full" style={{ width: '10px', height: '7px', background: '#d4a880', top: '110px', left: '50%', transform: 'translateX(-50%)' }} />
            {/* Mouth */}
            <div className="absolute" style={{ bottom: '32px', left: '50%', transform: 'translateX(-50%)' }}>
              {isActive ? (
                <div style={{ width: '28px', height: '16px', background: '#7a3535', borderRadius: '14px', overflow: 'hidden', animation: 'aMouth 0.25s ease-in-out infinite alternate' }}>
                  <div style={{ background: '#c07070', borderRadius: '0 0 14px 14px', height: '40%', marginTop: '5px' }} />
                </div>
              ) : isListening ? (
                <svg width="34" height="14" viewBox="0 0 34 14"><path d="M3 4 Q17 14 31 4" stroke="#7a3535" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
              ) : (
                <svg width="30" height="12" viewBox="0 0 30 12"><path d="M3 5 Q15 12 27 5" stroke="#7a3535" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
              )}
            </div>
            {/* Cheeks */}
            <div className="absolute" style={{ top: '106px', left: '14px', width: '22px', height: '12px', borderRadius: '50%', background: 'rgba(240,140,110,0.22)' }} />
            <div className="absolute" style={{ top: '106px', right: '14px', width: '22px', height: '12px', borderRadius: '50%', background: 'rgba(240,140,110,0.22)' }} />
          </div>
        </div>
        {/* Name tag */}
        <div className="mt-5 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isListening || isActive ? 'bg-[#b5e220]' : 'bg-gray-300'}`}
            style={{ animation: (isActive || isListening) ? 'aDot 1s ease-in-out infinite' : 'none' }} />
          <span className="text-gray-800 text-sm font-semibold tracking-wide">AIYA</span>
          <span className="text-gray-400 text-xs">· AI Interviewer</span>
        </div>
      </div>

      <style>{`
        @keyframes aFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes aRing   { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.05);opacity:.18} }
        @keyframes aBlink  { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.08)} }
        @keyframes aMouth  { from{height:9px} to{height:20px} }
        @keyframes aDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.75)} }
      `}</style>
    </div>
  );
}

// ── Waveform ──────────────────────────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-7">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="w-0.5 rounded-full bg-[#b5e220] transition-all"
          style={{ height: '3px', opacity: active ? 0.7 : 0.25, animation: active ? `wBar ${0.38 + (i % 5) * 0.09}s ease-in-out infinite alternate ${i * 0.04}s` : 'none' }} />
      ))}
      <style>{`@keyframes wBar { from{height:3px} to{height:22px} }`}</style>
    </div>
  );
}

// ── Score card ────────────────────────────────────────────────────────────────

function ScoreCard({ score }: { score: InterviewScore }) {
  const isMock = score.scored_by === 'mock';
  const items = [
    { label: 'Motivation',    value: score.motivation_score },
    { label: 'Leadership',    value: score.leadership_score },
    { label: 'Communication', value: score.communication_score },
    { label: 'Structure',     value: score.structure_score },
  ];
  return (
    <div className="w-full max-w-lg mx-auto mt-6">
      {isMock && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 text-center">
          ⚡ Preliminary score — final ML scoring will follow after review
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="text-center mb-4">
          <p className="text-3xl font-bold text-gray-900">{score.overall_score}<span className="text-base font-normal text-gray-400">/100</span></p>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-0.5">Overall score</p>
        </div>
        <div className="space-y-2.5">
          {items.map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-700 font-medium">{value}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#b5e220] rounded-full transition-all duration-700" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InterviewSessionPage() {
  const router = useRouter();
  const {
    stream, startCamera, stopCamera,
    speak, stopSpeaking, isSpeaking, ttsSupported,
    sessionData, sessionLoading, sessionError,
    startSession, submitAnswer, completeSession, cancelSession,
  } = useInterview();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<NodeJS.Timeout | null>(null);

  const [phase,           setPhase]      = useState<Phase>('init');
  const [questions,       setQuestions]  = useState<string[]>([]);
  const [currentIdx,      setIdx]        = useState(0);
  const [sessionId,       setSessionId]  = useState<string | null>(null);
  const [micOn,           setMicOn]      = useState(true);
  const [camOn,           setCamOn]      = useState(true);
  const [voiceOn,         setVoiceOn]    = useState(true);
  const [recSecs,         setRecSecs]    = useState(0);
  const [totalSecs,       setTotalSecs]  = useState(0);
  const [displayText,     setDisplay]    = useState('');
  const [isTyping,        setTyping]     = useState(false);
  const [error,           setError]      = useState('');
  const [currentAnswer,   setAnswer]     = useState('');
  const [score,           setScore]      = useState<InterviewScore | null>(null);
  // FIX: track initialisation state locally so the loading screen is controlled
  // by the init useEffect, not by the context's sessionData which updates async.
  const [isInitialising,  setInitialising] = useState(true);
  const totalSecsRef = useRef(0);

  // ── Step 1: Load API session on mount ─────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      // Attach camera (pre-warmed from InterviewProvider)
      let s = stream;
      if (!s) {
        await startCamera();
        s = stream;
      }
      if (s && videoRef.current) {
        videoRef.current.srcObject = s;
        streamRef.current = s;
      }

      // Start or resume backend session.
      // sessionData comes from the intro page (/interview) if the user went through it.
      // If the user navigates directly to /interview/session, we call startSession().
      const data = sessionData ?? await startSession();
      if (!data) {
        setError('Could not start interview session. Please go back and try again.');
        setPhase('error');
        setInitialising(false);
        return;
      }

      setSessionId(data.session_id);
      setQuestions(data.questions);
      setInitialising(false);
      setPhase('connecting');
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach stream when context updates
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    }
  }, [stream]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // ── Mic / cam toggles ──────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach(t => (t.enabled = !micOn));
    setMicOn(v => !v);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach(t => (t.enabled = !camOn));
    setCamOn(v => !v);
  }, [camOn]);

  // ── Typewriter + TTS ───────────────────────────────────────────────────────

  const say = useCallback((text: string, onDone?: () => void): (() => void) => {
    setDisplay('');
    setTyping(true);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setTyping(false); }
    }, 22);

    if (voiceOn && ttsSupported) {
      speak(text, onDone);
    } else {
      setTimeout(() => onDone?.(), Math.max(text.length * 40, 2000));
    }
    return () => clearInterval(iv);
  }, [voiceOn, ttsSupported, speak]);

  // ── Phase machine ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === 'connecting') {
      const t = setTimeout(() => setPhase('greeting'), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'greeting') {
      return say(GREETING, () => setTimeout(() => setPhase('question'), 700));
    }
    if (phase === 'question') {
      if (questions.length === 0) return;
      const q = questions[currentIdx];
      return say(q, () => setTimeout(() => setPhase('recording'), 500));
    }
    if (phase === 'recording') {
      setRecSecs(0);
      setAnswer('');
      timerRef.current = setInterval(() => {
        setRecSecs(s => s + 1);
        setTotalSecs(s => {
          totalSecsRef.current = s + 1;
          return s + 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (phase === 'transition') {
      const next = currentIdx + 1;
      return say(
        `Great, thank you! Moving on to question ${next} of ${questions.length}.`,
        () => setTimeout(() => setPhase('question'), 400),
      );
    }
    if (phase === 'completed') {
      stopCamera();
      return say("Thank you so much! Your responses have been recorded. Our team will review them shortly. Good luck with your application!");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, questions]);

  // ── Handle "Done" button ───────────────────────────────────────────────────

  const handleDone = useCallback(async () => {
    if (phase !== 'recording' || !sessionId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeaking();
    setPhase('saving');

    // Submit answer to backend (use currentAnswer state, fallback to placeholder)
    const answerText = currentAnswer.trim() || '[No transcription — voice answer recorded]';
    const ok = await submitAnswer(sessionId, currentIdx, answerText);

    if (!ok) {
      // Non-fatal: log and continue — we don't want to block the user
      console.warn(`Answer ${currentIdx} submission failed, continuing.`);
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setIdx(nextIdx);
      setPhase('transition');
    } else {
      // All questions answered — complete the session
      setPhase('completing');
      const result = await completeSession(sessionId, totalSecsRef.current);
      if (result) setScore(result);
      setPhase('completed');
    }
  }, [phase, sessionId, currentIdx, currentAnswer, questions.length, stopSpeaking, submitAnswer, completeSession]);

  // ── Handle "End interview" button ──────────────────────────────────────────

  const handleEnd = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeaking();
    stopCamera();
    if (sessionId && phase !== 'completed') {
      await cancelSession(sessionId);
    }
    router.push('/apply');
  }, [sessionId, phase, stopSpeaking, stopCamera, cancelSession, router]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const talking  = ['greeting', 'question', 'transition', 'completed'].includes(phase) && (isTyping || isSpeaking);
  const progress = questions.length > 0
    ? ((currentIdx + (phase === 'completed' ? 1 : 0)) / questions.length) * 100
    : 0;

  // ── Error state ────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-gray-900 font-semibold mb-2">Session Error</h2>
          <p className="text-gray-400 text-sm mb-6">{error || sessionError}</p>
          <button onClick={() => router.push('/interview')}
            className="px-5 py-2.5 bg-[#b5e220] text-gray-900 rounded-xl text-sm font-semibold hover:bg-[#a3cc1a]">
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ── Init / loading state ───────────────────────────────────────────────────
  // FIX: use local `isInitialising` flag instead of `sessionLoading || !sessionData`
  // to avoid the race where sessionData context state hasn't updated yet.

  if (isInitialising || sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-[#b5e220] animate-spin" />
          <p className="text-gray-400 text-sm">Preparing your interview session…</p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Raleway, sans-serif' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-[#b5e220] flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-900">iU</span>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">AI Interview · Stage 0</span>
        </div>
        <div className="flex items-center gap-3">
          {ttsSupported && (
            <button onClick={() => { setVoiceOn(v => !v); if (isSpeaking) stopSpeaking(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${voiceOn ? 'bg-[#b5e220]/10 text-[#6b8c14] border-[#b5e220]/30' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
              {voiceOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {voiceOn ? 'Voice on' : 'Voice off'}
            </button>
          )}
          {phase === 'recording' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 text-xs font-semibold tabular-nums">{fmt(recSecs)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{fmt(totalSecs)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-[#b5e220] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* AIYA panel */}
        <div className="flex-1 relative flex flex-col items-center justify-center py-12 px-6 bg-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(181,226,32,0.06) 0%, transparent 100%)' }} />

          {/* Connecting overlay */}
          {phase === 'connecting' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
              <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-[#b5e220] animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Connecting to AIYA…</p>
            </div>
          )}

          {/* Saving overlay */}
          {(phase === 'saving' || phase === 'completing') && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 text-[#8aaa18] animate-spin" />
              <span className="text-gray-500 text-xs">
                {phase === 'saving' ? 'Saving your answer…' : 'Generating your score…'}
              </span>
            </div>
          )}

          {/* Avatar */}
          <div className="relative z-10 w-[260px] h-[320px]">
            <AIYAAvatar speaking={talking} phase={phase} />
          </div>

          {/* Speech card */}
          {displayText && phase !== 'connecting' && phase !== 'init' && (
            <div className="relative z-10 mt-6 max-w-lg w-full">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#b5e220]/20 flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-2.5 h-2.5 text-[#8aaa18]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#8aaa18] font-semibold">AIYA</span>
                  {(isTyping || isSpeaking) && (
                    <div className="flex gap-0.5 ml-auto">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1 h-1 rounded-full bg-[#b5e220]"
                          style={{ animation: `sDot 0.9s ease-in-out infinite ${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{displayText}</p>
              </div>
              {phase === 'recording' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-gray-400 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#b5e220] animate-pulse" />
                  AIYA is listening to you…
                </div>
              )}
            </div>
          )}

          {/* Score card when completed */}
          {phase === 'completed' && score && <ScoreCard score={score} />}

          <style>{`
            @keyframes sDot { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-4px);opacity:1} }
          `}</style>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-80 bg-white border-l border-gray-100 flex flex-col">

          {/* Question progress */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Progress</p>
              <span className="text-xs text-gray-400 tabular-nums">
                {phase === 'completed' ? questions.length : currentIdx + 1} / {questions.length || '…'}
              </span>
            </div>
            <div className="flex gap-2">
              {(questions.length > 0 ? questions : Array(5).fill(null)).map((_, i) => {
                const done   = i < currentIdx || phase === 'completed';
                const active = i === currentIdx && phase !== 'completed';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-full h-1.5 rounded-full transition-all duration-500 ${done ? 'bg-[#b5e220]' : active ? 'bg-[#b5e220]/50' : 'bg-gray-100'}`} />
                    {done
                      ? <CheckCircle2 className="w-3 h-3 text-[#8aaa18]" />
                      : active
                        ? <div className="w-3 h-3 rounded-full border-2 border-[#b5e220]/60 border-t-transparent animate-spin" />
                        : <div className="w-3 h-3 rounded-full border-2 border-gray-200" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current question text */}
          {phase !== 'completed' && questions[currentIdx] && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Question {currentIdx + 1}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">
                {questions[currentIdx]}
              </p>
            </div>
          )}

          {/* Answer text area — visible during recording so user can type/review */}
          {phase === 'recording' && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Your answer <span className="normal-case tracking-normal text-gray-300">(optional — type or speak)</span>
              </p>
              <textarea
                value={currentAnswer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here, or just speak — AIYA is listening…"
                rows={3}
                className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#b5e220] focus:ring-1 focus:ring-[#b5e220]/30 placeholder:text-gray-300"
              />
            </div>
          )}

          {/* User video */}
          <div className="px-5 py-4 flex-1 flex flex-col">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">You</p>
            <div className="relative rounded-xl overflow-hidden bg-gray-900 flex-1 min-h-[160px] flex items-center justify-center">
              <video ref={videoRef} autoPlay muted playsInline
                className={`w-full h-full object-cover transition-opacity ${camOn ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'scaleX(-1)' }} />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                  <VideoOff className="w-6 h-6 text-gray-300 mb-1" />
                  <p className="text-gray-400 text-xs">Camera off</p>
                </div>
              )}
              {phase === 'recording' && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-gray-600 text-[10px] font-semibold">REC</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <Waveform active={phase === 'recording' && micOn} />
            </div>
          </div>

          {/* Controls */}
          <div className="px-5 py-5 border-t border-gray-100 space-y-3">
            <div className="flex gap-2">
              <button onClick={toggleMic}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${micOn ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' : 'bg-red-50 text-red-500 border-red-200'}`}>
                {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                {micOn ? 'Mic on' : 'Mic off'}
              </button>
              <button onClick={toggleCam}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${camOn ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' : 'bg-red-50 text-red-500 border-red-200'}`}>
                {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                {camOn ? 'Cam on' : 'Cam off'}
              </button>
            </div>

            {phase === 'recording' && (
              <button onClick={handleDone}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#b5e220] text-gray-900 rounded-xl text-sm font-semibold hover:bg-[#a3cc1a] transition-colors shadow-sm">
                <ChevronRight className="w-4 h-4" />
                Done — next question
              </button>
            )}

            {phase === 'completed' && (
              <button onClick={() => router.push('/apply')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#b5e220] text-gray-900 rounded-xl text-sm font-semibold hover:bg-[#a3cc1a] transition-colors shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                Continue to Application
              </button>
            )}

            {['connecting', 'greeting', 'question', 'saving', 'completing', 'transition'].includes(phase) && (
              <div className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {phase === 'saving' ? 'Saving answer…' : phase === 'completing' ? 'Scoring…' : 'Please wait for AIYA…'}
              </div>
            )}

            <button onClick={handleEnd}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 border border-red-200 bg-red-50 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors">
              <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
              End interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}