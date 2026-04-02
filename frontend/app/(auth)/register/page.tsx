'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, RotateCcw } from 'lucide-react';
import { authApi, saveTokens } from '@/lib/auth';

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all duration-150';

type Step = 'register' | 'verify';

export default function RegisterPage() {
  const router  = useRouter();
  const [step, setStep] = useState<Step>('register');

  // Step 1
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Step 2
  const [code,         setCode]         = useState('');
  const [verifying,    setVerifying]    = useState(false);
  const [resending,    setResending]    = useState(false);
  const [verifyError,  setVerifyError]  = useState('');
  const [resendMsg,    setResendMsg]    = useState('');

  // ── Step 1: register ───────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.register(email, password);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify email ───────────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) { setVerifyError('Please enter the verification code.'); return; }
    setVerifying(true);
    setVerifyError('');
    try {
      await authApi.verifyEmail(email, code);
      // Auto-login after verification
      const tokens = await authApi.login(email, password);
      saveTokens(tokens);
      router.push('/apply');
    } catch (err: any) {
      setVerifyError(err.message || 'Invalid or expired code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setVerifyError('');
    try {
      const res = await authApi.resendCode(email);
      setResendMsg(res.message || 'Code sent! Check your inbox.');
    } catch (err: any) {
      setVerifyError(err.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#b5e220] flex items-center justify-center mb-3">
            <span className="text-sm font-black text-gray-900">iU</span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">inVision University</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">
            {step === 'register' ? 'Create account' : 'Verify your email'}
          </h1>
          {step === 'verify' && (
            <p className="text-sm text-gray-400 text-center mt-1">
              We sent a code to <span className="font-medium text-gray-600">{email}</span>
            </p>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {(['register', 'verify'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s ? 'bg-[#b5e220] text-gray-900'
                : i < (['register','verify'] as Step[]).indexOf(step)
                ? 'bg-[#b5e220]/20 text-[#6a8a10]'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {i < (['register','verify'] as Step[]).indexOf(step)
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : i + 1
                }
              </div>
              {i < 1 && <div className={`w-8 h-px ${step === 'verify' ? 'bg-[#b5e220]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {/* ── Step 1 ── */}
          {step === 'register' && (
            <>
              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                    Email <span className="text-gray-300">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                    Password <span className="text-gray-300">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" autoComplete="new-password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Strength hint */}
                  {password && (
                    <div className="flex gap-1 mt-0.5">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3
                            ? i <= 1 ? 'bg-red-300' : i <= 2 ? 'bg-amber-300' : i <= 3 ? 'bg-[#b5e220]/70' : 'bg-[#b5e220]'
                            : 'bg-gray-100'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-[#b5e220] text-gray-900 rounded-xl hover:bg-[#a3cc1a] disabled:opacity-50 transition-colors mt-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 'verify' && (
            <>
              {verifyError && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{verifyError}
                </div>
              )}
              {resendMsg && (
                <div className="mb-4 px-3 py-2.5 bg-[#b5e220]/10 border border-[#b5e220]/20 text-[#6a8a10] text-sm rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{resendMsg}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                    Verification code <span className="text-gray-300">*</span>
                  </label>
                  <input
                    type="text" value={code} onChange={e => setCode(e.target.value.trim())}
                    placeholder="Enter the code from your email"
                    maxLength={8}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#b5e220] focus:ring-2 focus:ring-[#b5e220]/20 transition-all text-center tracking-widest text-lg font-semibold"
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  type="submit" disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-[#b5e220] text-gray-900 rounded-xl hover:bg-[#a3cc1a] disabled:opacity-50 transition-colors"
                >
                  {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify email'}
                </button>

                <button
                  type="button" onClick={handleResend} disabled={resending}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  {resending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                    : <><RotateCcw className="w-3.5 h-3.5" /> Resend code</>
                  }
                </button>
              </form>

              <button
                type="button" onClick={() => { setStep('register'); setCode(''); setVerifyError(''); setResendMsg(''); }}
                className="mt-3 w-full text-center text-xs text-gray-300 hover:text-gray-500 transition-colors"
              >
                ← Back to registration
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[#8aaa18] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}