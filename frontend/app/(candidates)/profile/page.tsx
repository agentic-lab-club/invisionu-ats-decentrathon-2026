'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, CheckCircle, XCircle,
  Loader2, LogOut, Shield, Sparkles, Copy, Check,
} from 'lucide-react';
import { getAccessToken, getRefreshToken } from '@/lib/auth';
import Navbar from '@/components/ui/CandidateNavbar';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  is_email_verified: boolean;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:     { label: 'Administrator', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
  committee: { label: 'Committee',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
  user:      { label: 'Applicant',     color: 'text-[#4a7200]',  bg: 'bg-[#f0fad0] border-[#d4f07a]' },
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="p-1.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      <div className="w-16 h-16 rounded-[14px] bg-gradient-to-br from-[#b5e220] to-[#7aab00] flex items-center justify-center text-xl font-medium text-white">
        {initials}
      </div>
      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAccessToken();
      if (!token) { router.push('/login'); return; }
      try {
        const res = await fetch('/api/backend/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { getRefreshToken(); router.push('/login'); return; }
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setProfile(data.user);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await new Promise(r => setTimeout(r, 400));
    getRefreshToken();
    router.push('/login');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-[#b5e220]" />
      <span className="text-sm text-gray-400">Loading profile…</span>
    </div>
  );

  if (error || !profile) return (
    <div className="max-w-[680px] mx-auto mt-16 p-6 text-center">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
        {error || 'Unable to load profile'}
      </div>
    </div>
  );

  const roleMeta = ROLE_META[profile.role] ?? {
    label: profile.role,
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
  };

  return (
    <>
      <Navbar />
      <div className="max-w-[680px] mx-auto py-10 px-6 space-y-4">

        {/* Header */}
        <div className="mb-2">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Account</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-0.5">My profile</h1>
        </div>

        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-[3px] w-full bg-gradient-to-r from-[#b5e220] via-[#8aaa18] to-[#b5e220]" />
          <div className="p-6">
            <div className="flex items-center gap-5">
              <Avatar firstName={profile.first_name} lastName={profile.last_name} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5 truncate">{profile.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${roleMeta.bg} ${roleMeta.color}`}>
                    <Shield className="w-3 h-3" />
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">

          {/* Email */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Email</p>
              <p className="text-sm text-gray-900 truncate">{profile.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {profile.is_email_verified ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                  <XCircle className="w-3 h-3" /> Unverified
                </span>
              )}
              <CopyButton value={profile.email} />
            </div>
          </div>

          {/* Phone */}
          {profile.phone_number && (
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Phone</p>
                <p className="text-sm text-gray-900">{profile.phone_number}</p>
              </div>
              <CopyButton value={profile.phone_number} />
            </div>
          )}

          {/* User ID */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">User ID</p>
              <p className="text-sm text-gray-500 font-mono truncate">{profile.id}</p>
            </div>
            <CopyButton value={profile.id} />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 bg-white border border-red-100 rounded-2xl hover:bg-red-50 hover:border-red-200 disabled:opacity-60 transition-all"
        >
          {loggingOut
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <LogOut className="w-4 h-4" />
          }
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>

      </div>
    </>
  );
}