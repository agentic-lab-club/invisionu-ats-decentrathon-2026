// app/api/apply/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Простая функция анализа эссе
function analyzeEssay(essay: string) {
  const lowerEssay = essay.toLowerCase();
  // Ключевые слова
  const motivationWords = ['motivation', 'want', 'goal', 'dream', 'aspire', 'passion', 'drive'];
  const leadershipWords = ['lead', 'leader', 'team', 'organize', 'manage', 'initiative', 'mentor', 'coordinate'];
  const structureScore = 50; // базовая оценка структуры (можно улучшить)

  let motivationCount = 0;
  let leadershipCount = 0;

  for (const word of motivationWords) {
    if (lowerEssay.includes(word)) motivationCount++;
  }
  for (const word of leadershipWords) {
    if (lowerEssay.includes(word)) leadershipCount++;
  }

  // Нормируем к 100 (максимум 10 совпадений)
  const motivationScore = Math.min(100, motivationCount * 10);
  const leadershipScore = Math.min(100, leadershipCount * 10);
  // Структура: проверяем на наличие вступления и заключения (просто по наличию слов "introduction", "conclusion")
  let structureBoost = 0;
  if (lowerEssay.includes('introduction')) structureBoost += 20;
  if (lowerEssay.includes('conclusion')) structureBoost += 20;
  if (essay.split('\n').length > 3) structureBoost += 10;
  const structureScoreFinal = Math.min(100, structureScore + structureBoost);

  const overallScore = Math.round((motivationScore + leadershipScore + structureScoreFinal) / 3);

  // Формируем evidence
  const motivationEvidence = `Found keywords: ${motivationWords.filter(w => lowerEssay.includes(w)).join(', ') || 'none'}`;
  const leadershipEvidence = `Found keywords: ${leadershipWords.filter(w => lowerEssay.includes(w)).join(', ') || 'none'}`;
  const structureEvidence = `Essay has ${essay.split('\n').length} paragraphs; includes ${lowerEssay.includes('introduction') ? 'introduction' : 'no introduction'}, ${lowerEssay.includes('conclusion') ? 'conclusion' : 'no conclusion'}.`;

  const explanation = `Your application shows ${motivationScore}% motivation based on key terms found. Leadership score ${leadershipScore}% from leadership-related terms. Structure score ${structureScoreFinal}% from essay format. Overall potential: ${overallScore}%.`;

  return {
    subscores: {
      Motivation: motivationScore,
      Leadership: leadershipScore,
      Structure: structureScoreFinal,
    },
    overallScore,
    evidence: {
      Motivation: motivationEvidence,
      Leadership: leadershipEvidence,
      Structure: structureEvidence,
    },
    explanation,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, program, essay } = body;

    if (!name || !email || !program || !essay) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Проверяем, существует ли кандидат с таким email
    let candidateResult = await query('SELECT id FROM candidates WHERE email = $1', [email]);
    let candidateId: string;

    if (candidateResult.rows.length === 0) {
      // Создаём нового кандидата
      const insertResult = await query(
        `INSERT INTO candidates (external_id, email, created_at, updated_at, data_source)
         VALUES (gen_random_uuid(), $1, NOW(), NOW(), 'web_app')
         RETURNING id`,
        [email]
      );
      candidateId = insertResult.rows[0].id;
      
    } else {
      candidateId = candidateResult.rows[0].id;
    }
    if (body.ielts_score) {
  await query(`
    UPDATE candidates 
    SET ielts_score = $1 
    WHERE id = $2
  `, [body.ielts_score, candidateId]);
}


    // Создаём заявку
    const structuredData = {
      name,
      program,
      motivation_evidence: essay, // сохраняем эссе как evidence
      leadership_evidence: essay,
      structure_evidence: essay,
    };
    const appResult = await query(
      `INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
       VALUES ($1, NOW(), $2, $3)
       RETURNING id`,
      [candidateId, structuredData, essay]
    );
    const applicationId = appResult.rows[0].id;

    // Анализируем
    const analysis = analyzeEssay(essay);

    // Сохраняем в scores
    await query(
      `INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [applicationId, analysis.overallScore, analysis.subscores.Motivation, analysis.subscores.Leadership, analysis.subscores.Structure]
    );

    // Сохраняем в ml_analysis
    const analysisJson = {
      categories: analysis.subscores,
      evidence: analysis.evidence,
      explanation: analysis.explanation,
    };
    await query(
      `INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [applicationId, analysisJson]
    );

    // Устанавливаем начальный статус "new"
    await query(
      `INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
       VALUES ($1, 'new', 'Application submitted', 'system', NOW())`,
      [candidateId]
    );

    return NextResponse.json({ candidateId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}