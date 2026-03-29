import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const statusCounts = await query(`
      SELECT status, COUNT(*) as count
      FROM candidate_statuses
      GROUP BY status
    `);

    const scoreDistribution = await query(`
      WITH latest_scores AS (
        SELECT DISTINCT ON (application_id) 
          application_id,
          overall_score
        FROM scores
        ORDER BY application_id, calculated_at DESC
      )
      SELECT 
        CASE 
          WHEN overall_score < 20 THEN '0-19'
          WHEN overall_score < 30 THEN '20-29'
          WHEN overall_score < 40 THEN '30-39'
          WHEN overall_score < 50 THEN '40-49'
          WHEN overall_score < 60 THEN '50-59'
          WHEN overall_score < 70 THEN '60-69'
          WHEN overall_score < 80 THEN '70-79'
          WHEN overall_score < 90 THEN '80-89'
          ELSE '90-100'
        END AS score_range,
        COUNT(*) as count
      FROM latest_scores
      GROUP BY score_range
      ORDER BY MIN(overall_score)
    `);

    const categoryAverages = await query(`
      SELECT 
        AVG(motivation_avg) as motivation_avg,
        AVG(leadership_avg) as leadership_avg,
        AVG(structure_avg) as structure_avg
      FROM scores
    `);

    // IELTS распределение
    const ieltsDistribution = await query(`
      WITH ielts_ranges AS (
        SELECT 
          CASE 
            WHEN ielts_score < 4 THEN '0-3.9'
            WHEN ielts_score < 5 THEN '4-4.9'
            WHEN ielts_score < 6 THEN '5-5.9'
            WHEN ielts_score < 7 THEN '6-6.9'
            WHEN ielts_score < 8 THEN '7-7.9'
            ELSE '8-9'
          END AS ielts_range,
          COUNT(*) as count
        FROM candidates
        WHERE ielts_score IS NOT NULL
        GROUP BY ielts_range
        ORDER BY MIN(ielts_score)
      )
      SELECT * FROM ielts_ranges
    `);

    const topKeywords = await query(`
      SELECT 
        word,
        COUNT(*) as frequency
      FROM (
        SELECT unnest(regexp_matches(analysis_json->>'explanation', '\\w+', 'g')) as word
        FROM ml_analysis
      ) words
      WHERE length(word) > 3
      GROUP BY word
      ORDER BY frequency DESC
      LIMIT 10
    `);

    return NextResponse.json({
      statusCounts: statusCounts.rows,
      scoreDistribution: scoreDistribution.rows,
      categoryAverages: categoryAverages.rows[0] || { motivation_avg: 0, leadership_avg: 0, structure_avg: 0 },
      topKeywords: topKeywords.rows,
      ieltsDistribution: ieltsDistribution.rows, // добавили
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}