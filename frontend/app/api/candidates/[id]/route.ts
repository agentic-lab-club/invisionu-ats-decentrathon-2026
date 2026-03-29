// app/api/candidates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function generateExplanation(subscores: Record<string, number>, evidence: Record<string, string>): string {
  let highestCat = '', highestVal = 0;
  let lowestCat = '', lowestVal = 100;
  for (const [cat, val] of Object.entries(subscores)) {
    if (val > highestVal) { highestCat = cat; highestVal = val; }
    if (val < lowestVal) { lowestCat = cat; lowestVal = val; }
  }
  return `Кандидат показывает сильные стороны в "${highestCat}" (${highestVal}%), однако требует развития в "${lowestCat}" (${lowestVal}%). ${evidence[highestCat] || ''}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await query(`
      SELECT 
        c.id,
        c.external_id,
        a.id as application_id,
        a.structured_data,
        a.essay_text,
        a.video_transcript,
        s.overall_score,
        s.motivation_avg,
        s.leadership_avg,
        s.structure_avg,
        ma.analysis_json
      FROM candidates c
      LEFT JOIN (
        SELECT * FROM applications 
        WHERE candidate_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
      ) a ON a.candidate_id = c.id
      LEFT JOIN scores s ON s.application_id = a.id
      LEFT JOIN ml_analysis ma ON ma.application_id = a.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const structuredData = row.structured_data || {};

    // Собираем суб-оценки
    const subscores: Record<string, number> = {};
    if (row.motivation_avg !== null) subscores['Motivation'] = row.motivation_avg;
    if (row.leadership_avg !== null) subscores['Leadership'] = row.leadership_avg;
    if (row.structure_avg !== null) subscores['Structure'] = row.structure_avg;
    if (row.analysis_json?.categories) {
      Object.assign(subscores, row.analysis_json.categories);
    }

    // Собираем обоснования
    const evidence: Record<string, string> = {
      'Motivation': row.essay_text || structuredData.motivation_evidence || 'Нет данных',
      'Leadership': structuredData.leadership_evidence || 'Нет данных',
      'Structure': structuredData.structure_evidence || 'Нет данных',
    };
    if (row.analysis_json?.evidence) {
      Object.assign(evidence, row.analysis_json.evidence);
    }

    // Получаем последний статус
    const statusResult = await query(`
      SELECT status FROM candidate_statuses
      WHERE candidate_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [id]);

    const candidateData = {
      id: row.id,
      name: structuredData.name || 'Unknown',
      program: structuredData.program || 'Не указана', // заменяем position на program
      overallScore: row.overall_score || 0,
      subscores,
      evidence,
      status: statusResult.rows[0]?.status || 'new',
      explanation: row.analysis_json?.explanation || generateExplanation(subscores, evidence)
    };

    return NextResponse.json(candidateData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 });
  }
}