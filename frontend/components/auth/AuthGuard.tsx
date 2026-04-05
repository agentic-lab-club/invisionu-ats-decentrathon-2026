'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessToken, getStoredUser, isDashboardRole } from '@/lib/auth';

export default function AuthGuard({ children, requireDashboardRole = false }: {
  children: React.ReactNode;
  requireDashboardRole?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (requireDashboardRole) {
      const user = getStoredUser();
      if (!user || !isDashboardRole(user.role)) {
        router.replace('/apply');
        return;
      }
    }

    setReady(true);
  }, [pathname, requireDashboardRole, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-[#b5e220] border-t-transparent rounded-full animate-spin" />
          <span>Checking access…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
