'use client';

/**
 * InterviewContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialised on /interview (intro page) so camera is warm before the user
 * clicks "Begin Interview".  Also owns the API session lifecycle so both
 * pages share the same sessionId and question list.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getAccessToken } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export interface InterviewScore {
  motivation_score:    number;
  leadership_score:    number;
  communication_score: number;
  structure_score:     number;
  overall_score:       number;
  recommendation:      string;
  scored_by:           string;
  scored_at:           string;
}

export interface SessionData {
  session_id:      string;
  status:          string;
  questions:       string[];
  expires_at:      string;
  timeout_minutes: number;
}

interface InterviewContextValue {
  // Camera
  stream:      MediaStream | null;
  camReady:    boolean;
  camError:    string | null;
  startCamera: () => Promise<void>;
  stopCamera:  () => void;

  // TTS
  speak:        (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  isSpeaking:   boolean;
  ttsSupported: boolean;

  // API session
  sessionData:     SessionData | null;
  sessionLoading:  boolean;
  sessionError:    string | null;
  startSession:    (programCode?: string) => Promise<SessionData | null>;
  submitAnswer:    (sessionId: string, questionIndex: number, answer: string) => Promise<boolean>;
  completeSession: (sessionId: string, durationSeconds: number) => Promise<InterviewScore | null>;
  cancelSession:   (sessionId: string) => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const InterviewContext = createContext<InterviewContextValue | null>(null);

// ── TTS helper ────────────────────────────────────────────────────────────────

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Samantha', 'Google UK English Female', 'Microsoft Zira', 'Karen', 'Moira', 'Tessa', 'Fiona'];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith('en') && /female|woman/i.test(v.name))
    ?? voices.find(v => v.lang.startsWith('en'))
    ?? voices[0]
    ?? null;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body?: object): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`/api/backend${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function InterviewProvider({ children }: { children: ReactNode }) {
  const streamRef    = useRef<MediaStream | null>(null);

  const [stream,         setStream]         = useState<MediaStream | null>(null);
  const [camReady,       setCamReady]       = useState(false);
  const [camError,       setCamError]       = useState<string | null>(null);
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [ttsSupported,   setTtsSupported]   = useState(false);
  const [sessionData,    setSessionData]    = useState<SessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError,   setSessionError]   = useState<string | null>(null);

  // Detect TTS + prime voices
  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setTtsSupported(supported);
    if (supported) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      setStream(s);
      setCamReady(true);
      setCamError(null);
    } catch (e: any) {
      setCamError(e?.message ?? 'Camera access denied');
      setCamReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    setCamReady(false);
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter   = new SpeechSynthesisUtterance(text);
    utter.rate    = 0.92;
    utter.pitch   = 1.05;
    utter.volume  = 1;
    const voice   = getBestVoice();
    if (voice) utter.voice = voice;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => { setIsSpeaking(false); onEnd?.(); };
    utter.onerror = () => { setIsSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ── API: startSession ────────────────────────────────────────────────────────

  const startSession = useCallback(async (programCode?: string): Promise<SessionData | null> => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const data = await apiPost<SessionData>('/v1/interview/sessions', {
        program_code: programCode ?? '',
      });
      setSessionData(data);
      return data;
    } catch (e: any) {
      setSessionError(e?.message ?? 'Failed to start session');
      return null;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  // ── API: submitAnswer ────────────────────────────────────────────────────────

  const submitAnswer = useCallback(async (
    sessionId: string,
    questionIndex: number,
    answer: string,
  ): Promise<boolean> => {
    try {
      await apiPost(`/v1/interview/sessions/${sessionId}/answers`, {
        question_index: questionIndex,
        answer,
      });
      return true;
    } catch (e: any) {
      console.error('submitAnswer error:', e?.message);
      return false;
    }
  }, []);

  // ── API: completeSession ─────────────────────────────────────────────────────

  const completeSession = useCallback(async (
    sessionId: string,
    durationSeconds: number,
  ): Promise<InterviewScore | null> => {
    try {
      const resp = await apiPost<{ score?: InterviewScore }>(
        `/v1/interview/sessions/${sessionId}/complete`,
        { total_duration_seconds: durationSeconds },
      );
      return resp.score ?? null;
    } catch (e: any) {
      console.error('completeSession error:', e?.message);
      return null;
    }
  }, []);

  // ── API: cancelSession ───────────────────────────────────────────────────────

  const cancelSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await apiPost(`/v1/interview/sessions/${sessionId}/cancel`);
    } catch {
      // best-effort — don't block UI
    }
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, [stopCamera, stopSpeaking]);

  return (
    <InterviewContext.Provider value={{
      stream, camReady, camError, startCamera, stopCamera,
      speak, stopSpeaking, isSpeaking, ttsSupported,
      sessionData, sessionLoading, sessionError,
      startSession, submitAnswer, completeSession, cancelSession,
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error('useInterview must be used within <InterviewProvider>');
  return ctx;
}