const BACKEND = '/api/backend';

export class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export interface TalentLead {
  id: string;
  title: string;
  link: string;
  source: string;
  high_school_student_name?: string | null;
  published_at?: string | null;
  published_date_raw?: string | null;
  winner_info?: string | null;
  synced_at: string;
}

export interface TalentsListResponse {
  items: TalentLead[];
  total: number;
  limit: number;
  offset: number;
}

export interface TalentsStatusResponse {
  backend: {
    total_in_db: number;
    last_synced_at?: string | null;
  };
  scraper: {
    updated_at_utc?: string | null;
    total: number;
    sources_scraped: string[];
  };
}

export interface TalentsSyncResponse {
  imported_total: number;
  inserted: number;
  updated: number;
  synced_at: string;
  scraper_updated_at_utc?: string | null;
}

export interface FetchTalentsParams {
  source?: string;
  query?: string;
  limit: number;
  offset: number;
}

async function requestJSON<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload || `Request failed with status ${response.status}`
        : payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new APIError(response.status, message);
  }

  return payload as T;
}

export async function fetchTalents(token: string, params: FetchTalentsParams): Promise<TalentsListResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  if (params.source) {
    query.set('source', params.source);
  }
  if (params.query) {
    query.set('query', params.query);
  }

  return requestJSON<TalentsListResponse>(`/talents?${query.toString()}`, { method: 'GET' }, token);
}

export async function fetchTalentsStatus(token: string): Promise<TalentsStatusResponse> {
  return requestJSON<TalentsStatusResponse>('/talents/status', { method: 'GET' }, token);
}

export async function syncTalents(token: string): Promise<TalentsSyncResponse> {
  return requestJSON<TalentsSyncResponse>('/talents/sync', { method: 'POST' }, token);
}
