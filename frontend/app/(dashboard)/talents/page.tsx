'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Database,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { getAccessToken } from '@/lib/auth';
import {
  APIError,
  fetchTalents,
  fetchTalentsStatus,
  syncTalents,
  type TalentLead,
  type TalentsListResponse,
  type TalentsStatusResponse,
} from '@/lib/talentsApi';

const PAGE_SIZE = 50;

function formatDisplayDate(value?: string | null, fallback?: string | null) {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  return fallback || '—';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSyncMessage(inserted: number, updated: number, importedTotal: number) {
  return `Imported ${importedTotal} talents (${inserted} new, ${updated} updated).`;
}

function mapStatusError(error: unknown) {
  if (error instanceof APIError && error.status === 502) {
    return 'TalentParser is unavailable right now.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to load TalentParser status.';
}

function mapSyncError(error: unknown) {
  if (error instanceof APIError && error.status === 409) {
    return 'Scraper cache is empty. Wait for scheduled refresh.';
  }

  if (error instanceof APIError && error.status === 502) {
    return 'TalentParser is unavailable right now.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to sync talents.';
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-lg">
      <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            <div className="h-4 w-28 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 flex-1 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  onSync,
  syncing,
}: {
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-[#b5e220]/15 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-[#8aaa18]" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">No talents imported yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Run a sync to import the current TalentParser cache into the dashboard.
        </p>
      </div>
      <button
        onClick={onSync}
        disabled={syncing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#b5e220] text-sm font-medium text-gray-900 hover:bg-[#a8d31c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync from TalentParser'}
      </button>
    </div>
  );
}

function NoResultsState({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
        <Search className="w-5 h-5 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">No matching talents</p>
        <p className="text-xs text-gray-400 mt-1">
          Try a different search query or clear the current filters.
        </p>
      </div>
      <button
        onClick={onClear}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

export default function TalentsPage() {
  const [items, setItems] = useState<TalentLead[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<TalentsStatusResponse | null>(null);

  const [source, setSource] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');

  const [loadingList, setLoadingList] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [listError, setListError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  async function loadList(nextOffset = offset, nextSource = source, nextQuery = query) {
    const token = getAccessToken();
    if (!token) {
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    setListError('');

    try {
      const response: TalentsListResponse = await fetchTalents(token, {
        source: nextSource,
        query: nextQuery,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setItems(response.items || []);
      setTotal(response.total || 0);
      setOffset(response.offset || 0);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to load talents.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadStatus() {
    const token = getAccessToken();
    if (!token) {
      setLoadingStatus(false);
      return;
    }

    setLoadingStatus(true);
    setStatusError('');

    try {
      const response = await fetchTalentsStatus(token);
      setStatus(response);
    } catch (error) {
      setStatusError(mapStatusError(error));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function refreshPage(nextOffset = offset, nextSource = source, nextQuery = query) {
    await Promise.all([
      loadStatus(),
      loadList(nextOffset, nextSource, nextQuery),
    ]);
  }

  useEffect(() => {
    refreshPage(0, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(queryInput.trim());
    await refreshPage(0, source, queryInput.trim());
  }

  async function handleSourceChange(nextSource: string) {
    setSource(nextSource);
    await refreshPage(0, nextSource, query);
  }

  async function handleClearFilters() {
    setSource('');
    setQuery('');
    setQueryInput('');
    await refreshPage(0, '', '');
  }

  async function handleSync() {
    const token = getAccessToken();
    if (!token) return;

    setSyncing(true);
    setSyncMessage('');
    setSyncError('');

    try {
      const response = await syncTalents(token);
      setSyncMessage(buildSyncMessage(response.inserted, response.updated, response.imported_total));
      await refreshPage(offset, source, query);
    } catch (error) {
      setSyncError(mapSyncError(error));
    } finally {
      setSyncing(false);
    }
  }

  async function handlePrevious() {
    if (offset === 0) return;
    await refreshPage(Math.max(0, offset - PAGE_SIZE), source, query);
  }

  async function handleNext() {
    if (offset + PAGE_SIZE >= total) return;
    await refreshPage(offset + PAGE_SIZE, source, query);
  }

  const sources = Array.from(new Set(status?.scraper.sources_scraped || []));
  const hasItems = items.length > 0;
  const hasActiveFilters = Boolean(source || query);
  const showEmptyState = !loadingList && !listError && !hasItems && total === 0 && !hasActiveFilters;
  const showNoResultsState = !loadingList && !listError && !hasItems && total === 0 && hasActiveFilters;

  return (
    <div className="w-full mx-auto py-2 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            inVision University
          </p>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#b5e220]/15 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#8aaa18]" />
            </div>
            Talents
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Imported talent leads from TalentParser, stored in backend.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#b5e220] text-sm font-medium text-gray-900 hover:bg-[#a8d31c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from TalentParser'}
          </button>

          {syncMessage ? (
            <p className="text-xs text-[#6a8a10] font-medium">{syncMessage}</p>
          ) : null}

          {syncError ? (
            <p className="text-xs text-red-500 font-medium">{syncError}</p>
          ) : null}
        </div>
      </div>

      {statusError ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{statusError}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <StatusPill
          label="Total In DB"
          value={loadingStatus && !status ? '...' : status?.backend.total_in_db ?? total}
        />
        <StatusPill
          label="Scraper Cache"
          value={loadingStatus && !status ? '...' : status?.scraper.total ?? '—'}
        />
        <StatusPill
          label="Last Synced"
          value={loadingStatus && !status ? '...' : formatDateTime(status?.backend.last_synced_at)}
        />
        <StatusPill
          label="Scraper Updated"
          value={loadingStatus && !status ? '...' : formatDateTime(status?.scraper.updated_at_utc)}
        />
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search by article title or winner info"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-[#b5e220] transition-colors"
          />
        </div>

        <select
          value={source}
          onChange={(event) => void handleSourceChange(event.target.value)}
          className="w-full lg:w-52 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-[#b5e220] transition-colors"
        >
          <option value="">All sources</option>
          {sources.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => void handleClearFilters()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        </div>
      </form>

      {loadingList ? (
        <TableSkeleton />
      ) : listError ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 px-6 gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Failed to load talents</p>
            <p className="text-xs text-gray-400 mt-1">{listError}</p>
          </div>
          <button
            onClick={() => void refreshPage(offset, source, query)}
            className="px-4 py-2 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : showEmptyState ? (
        <EmptyState onSync={handleSync} syncing={syncing} />
      ) : showNoResultsState ? (
        <NoResultsState onClear={() => void handleClearFilters()} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="uppercase tracking-widest text-gray-400 font-semibold">Talent Leads</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600 font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Database className="w-3.5 h-3.5" />
              <span>
                Showing {items.length === 0 ? 0 : offset + 1}-{Math.min(offset + items.length, total)} of {total}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 bg-gray-50/40">
                <tr className="text-left">
                  {['Student', 'Source', 'Published', 'Article', 'Winner Info', 'Synced', 'Action'].map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-[11px] uppercase tracking-widest text-gray-400 font-semibold whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/40 transition-colors align-top">
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {item.high_school_student_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b5e220]/15 text-xs font-medium text-[#6a8a10] whitespace-nowrap">
                        {item.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDisplayDate(item.published_at, item.published_date_raw)}
                    </td>
                    <td className="px-6 py-4 min-w-[260px]">
                      <div className="text-sm font-medium text-gray-800 leading-6">
                        {item.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[260px]">
                      <p className="text-sm text-gray-500 leading-6 max-w-[320px] truncate">
                        {item.winner_info || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(item.synced_at)}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors whitespace-nowrap"
                      >
                        Open source
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => void handlePrevious()}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="text-xs text-gray-400">
              Page {Math.floor(offset / PAGE_SIZE) + 1}
            </span>

            <button
              onClick={() => void handleNext()}
              disabled={offset + PAGE_SIZE >= total}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
