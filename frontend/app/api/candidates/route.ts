// app/api/candidates/route.ts
// Proxy to the Go backend — keeps the same public URL shape so any
// legacy callers continue to work while the real data comes from Go.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const preset = searchParams.get('preset');

  // Route to the correct Go endpoint depending on whether a preset is active.
  let backendUrl: string;
  if (preset) {
    backendUrl = `${BACKEND}/candidates/smart-filter?preset=${encodeURIComponent(preset)}`;
  } else {
    const qs = new URLSearchParams({
      program_code: searchParams.get('program_code') ?? '',
      review_stage: searchParams.get('review_stage') ?? '',
      decision:     searchParams.get('decision') ?? '',
      search:       searchParams.get('search') ?? '',
    });
    backendUrl = `${BACKEND}/candidates?${qs.toString()}`;
  }

  const authHeader = request.headers.get('authorization') ?? '';

  try {
    const res = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('[/api/candidates] proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to reach backend', details: String(err) },
      { status: 502 },
    );
  }
}