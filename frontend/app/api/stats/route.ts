import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function buildMockStatistics() {
  return {
    source: 'mock',
    statusCounts: [
      { status: 'new', count: 5 },
      { status: 'review', count: 6 },
      { status: 'interview', count: 3 },
      { status: 'recommended', count: 2 },
      { status: 'rejected', count: 1 },
    ],
    scoreDistribution: [
      { score_range: '40-49', count: 1 },
      { score_range: '50-59', count: 2 },
      { score_range: '60-69', count: 4 },
      { score_range: '70-79', count: 5 },
      { score_range: '80-89', count: 3 },
      { score_range: '90-100', count: 2 },
    ],
    categoryAverages: {
      motivation_avg: 74,
      leadership_avg: 69,
      structure_avg: 72,
    },
    topKeywords: [
      { word: 'leadership', frequency: 14 },
      { word: 'motivation', frequency: 12 },
      { word: 'innovation', frequency: 10 },
      { word: 'impact', frequency: 9 },
      { word: 'initiative', frequency: 8 },
      { word: 'projects', frequency: 8 },
      { word: 'community', frequency: 7 },
      { word: 'growth', frequency: 6 },
      { word: 'mission', frequency: 6 },
      { word: 'teamwork', frequency: 5 },
    ],
    ieltsDistribution: [
      { ielts_range: '5-5.9', count: 2 },
      { ielts_range: '6-6.9', count: 5 },
      { ielts_range: '7-7.9', count: 6 },
      { ielts_range: '8-9', count: 2 },
    ],
  };
}

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

    const payload = {
      source: 'database',
      statusCounts: statusCounts.rows,
      scoreDistribution: scoreDistribution.rows,
      categoryAverages: categoryAverages.rows[0] || { motivation_avg: 0, leadership_avg: 0, structure_avg: 0 },
      topKeywords: topKeywords.rows,
      ieltsDistribution: ieltsDistribution.rows,
    };

    const isEmpty =
      payload.statusCounts.length === 0 &&
      payload.scoreDistribution.length === 0 &&
      payload.ieltsDistribution.length === 0 &&
      payload.topKeywords.length === 0;

    return NextResponse.json(isEmpty ? buildMockStatistics() : payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(buildMockStatistics());
  }
}
