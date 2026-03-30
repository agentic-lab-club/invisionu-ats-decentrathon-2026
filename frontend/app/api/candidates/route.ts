import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const preset = request.nextUrl.searchParams.get('preset');
    
    // Базовый запрос с CTE (как у вас было)
    let sql = `
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
          overall_score,
          motivation_avg,
          leadership_avg,
          structure_avg
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
        c.ielts_score,
        ls.motivation_avg,
        ls.leadership_avg,
        ls.structure_avg
      FROM candidates c
      LEFT JOIN last_applications la ON la.candidate_id = c.id
      LEFT JOIN last_scores ls ON ls.application_id = la.application_id
      LEFT JOIN last_statuses cs ON cs.candidate_id = c.id
      LEFT JOIN last_explanations le ON le.application_id = la.application_id
    `;

    // Добавляем условия фильтрации
    let whereClause = '';
    if (preset) {
      switch (preset) {
        case 'high_potential_low_english':
          whereClause = `
            WHERE (ls.leadership_avg IS NOT NULL AND ls.leadership_avg > 4.0)
              AND (ls.structure_avg < 3.0 OR c.ielts_score < 6.0)
          `;
          break;
        case 'strong_motivation_weak_soft':
          whereClause = `
            WHERE (ls.motivation_avg > 4.0 AND ls.leadership_avg < 3.0)
              AND (la.structured_data->>'projects' IS NOT NULL 
                   OR la.structured_data->>'experience' IS NOT NULL)
          `;
          break;
        case 'low_motivation_high_background':
          whereClause = `
            WHERE (ls.motivation_avg < 2.5 AND ls.leadership_avg > 3.5)
              AND (la.structured_data->>'achievements' IS NOT NULL)
          `;
          break;
        case 'top10_percent':
          whereClause = `
            WHERE ls.overall_score >= (
              SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY overall_score)
              FROM scores
            )
          `;
          break;
        default:
          whereClause = '';
      }
    }

    sql += whereClause + ' ORDER BY c.created_at DESC';
    
    const result = await query(sql);
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
    console.error('API /api/candidates error:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates', details: String(error) }, { status: 500 });
  }
}