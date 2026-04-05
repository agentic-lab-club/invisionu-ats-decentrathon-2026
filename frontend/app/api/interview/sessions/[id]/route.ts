// app/api/interview/sessions/[id]/route.ts
// GET /api/v1/interview/sessions/:id — admin-only endpoint that returns full session details
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization') ?? '';
  try {
    const res = await fetch(`${BACKEND}/api/v1/interview/sessions/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[/api/interview/sessions/${id} GET] proxy error:`, err);
    return NextResponse.json({ error: 'Failed to reach backend', details: String(err) }, { status: 502 });
  }
}