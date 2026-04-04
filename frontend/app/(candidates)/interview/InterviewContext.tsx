'use client';

/**
 * InterviewContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialised on /interview (intro page) so that by the time the user
 * clicks "Begin Interview" the camera stream is already warm and the
 * Web Speech API is primed.  Both pages share this context so the session
 * page never has to wait for getUserMedia.
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

// ── TTS helpers ──────────────────────────────────────────────────────────────

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority: English female voices. Order matters.
  const preferred = [
    'Samantha',   // macOS / iOS
    'Google UK English Female',
    'Microsoft Zira',
    'Karen',
    'Moira',
    'Tessa',
    'Fiona',
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  // Fallback: any en-US female-labelled voice
  const enFemale = voices.find(
    v => v.lang.startsWith('en') && /female|woman/i.test(v.name)
  );
  if (enFemale) return enFemale;
  // Final fallback: first English voice
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface InterviewContextValue {
  // Camera
  stream: MediaStream | null;
  camReady: boolean;
  camError: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;

  // TTS
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const InterviewContext = createContext<InterviewContextValue | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream]       = useState<MediaStream | null>(null);
  const [camReady, setCamReady]   = useState(false);
  const [camError, setCamError]   = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Detect TTS support on mount
  useEffect(() => {
    setTtsSupported('speechSynthesis' in window);
    // Pre-load voices (Chrome needs this warm-up call)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices(); // ensure populated
      };
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // already running
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

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // stop anything playing

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;

    const voice = getBestVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => { setIsSpeaking(false); onEnd?.(); };
    utter.onerror = () => { setIsSpeaking(false); onEnd?.(); };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, [stopCamera, stopSpeaking]);

  return (
    <InterviewContext.Provider value={{
      stream, camReady, camError,
      startCamera, stopCamera,
      speak, stopSpeaking, isSpeaking, ttsSupported,
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