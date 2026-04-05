// app/api/interview/sessions/route.ts
// Proxy for POST /api/v1/interview/sessions (start session)
// The rewrite in next.config.ts already forwards /api/backend/* → backend,
// but this explicit route gives us a place to add logging or validation if needed.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND}/api/v1/interview/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[/api/interview/sessions POST] proxy error:', err);
    return NextResponse.json({ error: 'Failed to reach backend', details: String(err) }, { status: 502 });
  }
}