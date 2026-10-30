'use client'

import { Spinner, api } from './PlatformUI'

export type ListPage<T> = { data: T[]; total: number; next_cursor?: string | null; filter_counts?: Record<string, number>; summary?: { total: number; completed: number; missed: number; average_duration: number } }

/** Refresh only the pages the operator has opened, using stable server cursors. */
export async function readListWindow<T>(path: string, pages = 1, signal?: AbortSignal): Promise<ListPage<T>> {
  const data: T[] = []
  let result: ListPage<T> = { data: [], total: 0 }
  let cursor = ''
  for (let page = 0; page < pages; page += 1) {
    result = await api<ListPage<T>>(`${path}${path.includes('?') ? '&' : '?'}limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`, { signal })
    data.push(...(result.data || []))
    if (!result.next_cursor) break
    cursor = result.next_cursor
  }
  return { ...result, data }
}

export function ListPaging({ loaded, total, loading, hasMore, onMore, noun = 'records' }: { loaded: number; total: number; loading: boolean; hasMore: boolean; onMore: () => void; noun?: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E9DFFF] px-4 py-3">
    <p role="status" aria-live="polite" className="text-sm text-slate-600">{loaded.toLocaleString()} of {total.toLocaleString()} {noun}</p>
    {hasMore && <button type="button" disabled={loading} onClick={onMore} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D8C8FF] bg-white px-3 text-sm font-semibold text-[#5A2BE6] transition hover:border-[#6C3BFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3BFF] disabled:cursor-wait disabled:opacity-60">{loading && <Spinner />} {loading ? 'Loading…' : `Load more ${noun}`}</button>}
  </div>
}
