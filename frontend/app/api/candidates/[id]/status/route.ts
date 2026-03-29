import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // получаем id из URL
  try {
    const body = await request.json();
    const { status, comment } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Проверяем, существует ли кандидат
    const candidateExists = await query('SELECT id FROM candidates WHERE id = $1', [id]);
    if (candidateExists.rows.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Вставляем новый статус
    await query(
      `INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, status, comment || null, 'system']
    );

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}