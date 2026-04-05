import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';

// ── Same mapping as CandidatesTableWithFavorites.tsx ──────────────────────────
const reviewStageMapping: Record<string, string> = {
  initial_screening:   'new',
  application_review:  'review',
  decision:            'decision',
};

function getUiStatus(reviewStage: string, decision: string): string {
  let uiStatus = reviewStageMapping[reviewStage] ?? 'new';
  if (uiStatus === 'decision') {
    if (decision === 'accepted')  uiStatus = 'recommended';
    else if (decision === 'rejected') uiStatus = 'rejected';
    else uiStatus = 'review';
  }
  return uiStatus;
}

// ── Fallback mock (only when backend is unreachable) ──────────────────────────
function buildMockStatistics() {
  return {
    source: 'mock',
    statusCounts: [
      { status: 'new',         count: 5 },
      { status: 'review',      count: 6 },
      { status: 'recommended', count: 2 },
      { status: 'rejected',    count: 1 },
    ],
    scoreDistribution: [
      { score_range: '0-1', count: 1 },
      { score_range: '1-2', count: 2 },
      { score_range: '2-3', count: 4 },
      { score_range: '3-4', count: 5 },
      { score_range: '4-5', count: 2 },
    ],
    categoryAverages: {
      motivation_avg:     3.2,
      leadership_avg:     2.9,
      values_avg:         3.8,
      planning_avg:       3.0,
      resilience_avg:     3.5,
      social_support_avg: 3.7,
    },
    topKeywords:      [],
    ieltsDistribution: [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResultJson(raw: any): any {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const headers = {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  try {
    // 1. Fetch full candidate list
    const listRes = await fetch(
      `${BACKEND}/candidates?program_code=&review_stage=&decision=&search=`,
      { headers, cache: 'no-store' },
    );

    if (!listRes.ok) {
      console.warn('[stats] backend list returned', listRes.status);
      return NextResponse.json(buildMockStatistics());
    }

    const listData = await listRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = listData?.items ?? (Array.isArray(listData) ? listData : []);

    if (items.length === 0) {
      return NextResponse.json(buildMockStatistics());
    }

    // 2. Compute statusCounts (exact same logic as the dashboard table)
    const statusMap: Record<string, number> = {};
    for (const item of items) {
      const uiStatus = getUiStatus(item.review_stage ?? '', item.decision ?? '');
      statusMap[uiStatus] = (statusMap[uiStatus] ?? 0) + 1;
    }
    const STATUS_ORDER = ['new', 'review', 'recommended', 'rejected'];
    const statusCounts = STATUS_ORDER
      .filter(s => statusMap[s] != null)
      .map(status => ({ status, count: statusMap[status] }));

    // 3. Fetch candidate details in parallel (for LLM scores)
    const detailResults = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.map((item: any) =>
        fetch(`${BACKEND}/candidates/${item.application_id}`, {
          headers,
          cache: 'no-store',
        }).then(r => r.json()),
      ),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details: any[] = detailResults
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    // 4. Extract LLM metrics
    const metricsAccum: Record<string, number[]> = {
      Motivation:    [],
      Leadership:    [],
      Values:        [],
      Planning:      [],
      Resilience:    [],
      Social_Support:[],
    };
    const admissionsPotentials: number[] = [];

    for (const detail of details) {
      const rj = parseResultJson(detail?.latest_llm_scoring_run?.result_json);
      if (!rj) continue;

      const am = rj.aggregated_metrics;
      if (am) {
        for (const key of Object.keys(metricsAccum)) {
          if (am[key] != null) metricsAccum[key].push(Number(am[key]));
        }
      }

      const gs = rj.global_score;
      if (gs?.AdmissionsPotential != null) {
        admissionsPotentials.push(Number(gs.AdmissionsPotential));
      }
    }

    const categoryAverages = {
      motivation_avg:     avg(metricsAccum.Motivation),
      leadership_avg:     avg(metricsAccum.Leadership),
      values_avg:         avg(metricsAccum.Values),
      planning_avg:       avg(metricsAccum.Planning),
      resilience_avg:     avg(metricsAccum.Resilience),
      social_support_avg: avg(metricsAccum.Social_Support),
    };

    // 5. Score distribution for AdmissionsPotential (scale 0–5)
    const scoreRangeOrder = ['0-1', '1-2', '2-3', '3-4', '4-5'];
    const scoreMap: Record<string, number> = {};
    for (const score of admissionsPotentials) {
      const bucket =
        score < 1 ? '0-1' :
        score < 2 ? '1-2' :
        score < 3 ? '2-3' :
        score < 4 ? '3-4' : '4-5';
      scoreMap[bucket] = (scoreMap[bucket] ?? 0) + 1;
    }
    const scoreDistribution = scoreRangeOrder
      .filter(r => scoreMap[r] != null)
      .map(score_range => ({ score_range, count: scoreMap[score_range] }));

    return NextResponse.json({
      source:           'database',
      statusCounts,
      scoreDistribution,
      categoryAverages,
      topKeywords:       [],   // not available from backend list/detail
      ieltsDistribution: [],   // not available from backend
    });

  } catch (error) {
    console.error('[stats] unexpected error:', error);
    return NextResponse.json(buildMockStatistics());
  }
}