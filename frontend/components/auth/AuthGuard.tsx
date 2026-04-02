'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAccessToken();
    // Если нет токена и мы не на страницах логина/регистрации, редирект
    if (!token && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
      router.push('/login');
    }
  }, [pathname, router]);

  return <>{children}</>;
}