// lib/auth.ts
// Shared auth utilities — token storage, API calls, user type

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  is_email_verified: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in_seconds: number;
  token_type: string;
  user: AuthUser;
}

// ── Storage ──────────────────────────────────────────────────────────────────
export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('access_token',  tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  localStorage.setItem('user',          JSON.stringify(tokens.user));
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getAccessToken()  { return localStorage.getItem('access_token')  ?? ''; }
export function getRefreshToken() { return localStorage.getItem('refresh_token') ?? ''; }
export function getStoredUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('user') ?? ''); } catch { return null; }
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiPost<T>(path: string, body: object, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error || data?.message
      || (typeof data === 'object' ? Object.values(data).join(', ') : 'Request failed');
    throw new Error(msg);
  }
  return data as T;
}

export const authApi = {
  register:    (email: string, password: string) =>
    apiPost<{ message: string }>('/auth/register', { email, password }),

  verifyEmail: (email: string, code: string) =>
    apiPost<{ message: string }>('/auth/verify-email', { email, code }),

  resendCode:  (email: string) =>
    apiPost<{ message: string }>('/auth/resend-code', { email }),

  login:       (email: string, password: string) =>
    apiPost<AuthTokens>('/auth/login', { email, password }),

  logout:      (refresh_token: string) =>
    apiPost<{ message: string }>('/auth/logout', { refresh_token }),

  refresh:     (refresh_token: string) =>
    apiPost<AuthTokens>('/auth/refresh', { refresh_token }),

  me: async (): Promise<{ user: AuthUser }> => {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Unauthorized');
    return data;
  },
};