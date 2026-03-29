import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      WITH last_applications AS (
        SELECT DISTINCT ON (candidate_id) 
          id AS application_id,
          candidate_id,
          structured_data,
          submitted_at
        FROM applications
        ORDER BY candidate_id, submitted_at DESC
      ),
      last_scores AS (
        SELECT DISTINCT ON (application_id) 
          application_id,
          overall_score
        FROM scores
        ORDER BY application_id, calculated_at DESC
      ),
      last_statuses AS (
        SELECT DISTINCT ON (candidate_id) 
          candidate_id,
          status
        FROM candidate_statuses
        ORDER BY candidate_id, created_at DESC
      ),
      last_explanations AS (
        SELECT DISTINCT ON (ma.application_id)
          ma.application_id,
          ma.analysis_json->>'explanation' AS explanation
        FROM ml_analysis ma
        ORDER BY ma.application_id, ma.created_at DESC
      )
 SELECT 
  c.id,
  c.external_id,
  la.structured_data->>'name' AS name,
  la.structured_data->>'program' AS program,
  ls.overall_score,
  cs.status,
  le.explanation,
  c.ielts_score
FROM candidates c
LEFT JOIN last_applications la ON la.candidate_id = c.id
LEFT JOIN last_scores ls ON ls.application_id = la.application_id
LEFT JOIN last_statuses cs ON cs.candidate_id = c.id
LEFT JOIN last_explanations le ON le.application_id = la.application_id
      ORDER BY c.created_at DESC
    `);

    // Преобразуем поля в camelCase для соответствия интерфейсу Candidate
const candidates = result.rows.map(row => ({
  id: row.id,
  name: row.name,
  program: row.program,
  overallScore: row.overall_score,
  status: row.status,
  explanation: row.explanation,
  ielts_score: row.ielts_score,
}));

    return NextResponse.json(candidates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}