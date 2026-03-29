// app/api/weights/route.ts (добавить PATCH)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { motivation_weight, leadership_weight, structure_weight, set_by } = body;
    
    // Вставляем новую запись настроек
    await query(`
      INSERT INTO weight_settings (motivation_weight, leadership_weight, structure_weight, set_by, set_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [motivation_weight, leadership_weight, structure_weight, set_by || 'system']);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update weights' }, { status: 500 });
  }
}