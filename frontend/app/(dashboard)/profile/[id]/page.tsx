// app/(dashboard)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, CheckCircle, XCircle, Loader2, LogOut } from 'lucide-react';
import { getAccessToken, getRefreshToken } from '@/lib/auth';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  is_email_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/backend/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          getRefreshToken();
          router.push('/login');
          return;
        }
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

  const handleLogout = () => {
    getRefreshToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#b5e220]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error || 'Unable to load profile'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#b5e220]/20 flex items-center justify-center">
          <User className="w-5 h-5 text-[#4d7c0f]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Account</p>
          <h1 className="text-xl font-semibold text-gray-900">My profile</h1>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#b5e220]/20 flex items-center justify-center text-2xl font-semibold text-[#4d7c0f]">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-900">{profile.email}</p>
            </div>
            {profile.is_email_verified ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                <XCircle className="w-3 h-3" /> Unverified
              </span>
            )}
          </div>

          {/* Phone */}
          {profile.phone_number && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Phone number</p>
                <p className="text-sm text-gray-900">{profile.phone_number}</p>
              </div>
            </div>
          )}

          {/* Role (optional) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Role</p>
              <p className="text-sm text-gray-900 capitalize">{profile.role}</p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}