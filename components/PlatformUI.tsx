'use client'

import { AlertTriangle, Check, Download, Loader2, Search, SlidersHorizontal, X } from 'lucide-react'
import { ReactNode } from 'react'

export const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'http://127.0.0.1:8000'

type ApiError = Error & { status?: number }

function messageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (Array.isArray(payload)) {
    const messages = payload.map(messageFromPayload).filter(Boolean)
    return messages.length ? messages.join('. ') : undefined
  }
  if (!payload || typeof payload !== 'object') return undefined

  const value = payload as Record<string, unknown>
  for (const key of ['message', 'msg', 'error', 'detail', 'reason']) {
    const message = messageFromPayload(value[key])
    if (message) return message
  }
  return undefined
}

export function userFacingError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = error instanceof Error ? error.message : messageFromPayload(error)
  if (!message || message === '[object Object]') return fallback
  if (/^(failed to fetch|networkerror|load failed)$/i.test(message)) return 'Cannot reach the workspace service. Check your connection and try again.'
  if (/aborted|timeout/i.test(message)) return 'The request took too long. Please try again.'
  return message
}

const PUBLIC_PAGES = ['/login', '/signup', '/invite/accept']

function signOutIfUnauthorized(status: number) {
  if (status === 401 && typeof window !== 'undefined' && !PUBLIC_PAGES.some((route) => window.location.pathname.startsWith(route))) {
    window.localStorage.removeItem('agentflow_token')
    window.location.href = '/login'
  }
}

/** fetch() that always sends the signed-in user's token. Accepts a full URL or an API path. */
export async function authFetch(input: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('agentflow_token') : null
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`
  const response = await fetch(url, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
  signOutIfUnauthorized(response.status)
  return response
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const response = await authFetch(path, { ...options, headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options?.headers || {}) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(messageFromPayload(payload) || `Request failed (${response.status})`) as ApiError
    error.status = response.status
    throw error
  }
  return payload
}

export async function apiWithRetry<T = any>(path: string, options?: RequestInit, attempts = 3, timeoutMs = 25000): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await api<T>(path, { ...options, signal: controller.signal })
    } catch (error) {
      lastError = error
      const status = (error as Error & { status?: number }).status
      const transient = !status || status === 408 || status === 429 || status >= 500 || (error instanceof DOMException && error.name === 'AbortError')
      if (!transient || attempt === attempts) throw error
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 1200))
    } finally {
      window.clearTimeout(timeout)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed after retries')
}

/** Download a CSV export with the user's token (a plain link cannot send it). */
export async function downloadCsv(resource: string) {
  const response = await authFetch(`/api/platform/export/${resource}.csv`)
  if (!response.ok) throw new Error(`Export failed (${response.status})`)
  const url = URL.createObjectURL(await response.blob())
  const link = Object.assign(document.createElement('a'), { href: url, download: `${resource}.csv` })
  document.body.appendChild(link); link.click(); link.remove()
  URL.revokeObjectURL(url)
}

export function MetricGrid({ items }: { items: { label: string; value: string | number; detail?: string; tone?: string }[] }) {
  return <div className="product-metric-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <div key={item.label} className="product-metric surface-panel"><div className="product-metric-label">{item.label}</div><div className="product-metric-value">{item.value}</div>{item.detail && <div className="product-metric-detail">{item.detail}</div>}</div>)}</div>
}

export function Toolbar({ search, onSearch, onExport, children }: { search?: string; onSearch?: (value: string) => void; onExport?: () => void; children?: ReactNode }) {
  return <div className="product-toolbar surface-panel flex flex-col gap-2.5 lg:flex-row lg:items-center">
    {onSearch && <div className="product-toolbar-search relative min-w-0 flex-1 lg:max-w-[440px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search records..." />{search ? <button type="button" onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full transition"><X className="h-4 w-4" /></button> : null}</div>}
    <div className="product-toolbar-controls flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {children}
      {onExport && <div className="ml-auto flex shrink-0 items-center gap-2">{onExport && <ActionButton onClick={onExport} icon={<Download className="h-4 w-4" />}>Export CSV</ActionButton>}</div>}
    </div>
  </div>
}

export function ActionButton({ children, onClick, icon, primary = false, disabled = false, title, tone = 'default' }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; primary?: boolean; disabled?: boolean; title?: string; tone?: 'default' | 'warning' | 'danger' | 'success' }) {
  const accessibleTitle = title || (typeof children === 'string' ? children : undefined)
  const toneClass = primary ? 'action-button-primary' : tone === 'warning' ? 'action-button-warning' : tone === 'danger' ? 'action-button-danger' : tone === 'success' ? 'action-button-success' : 'action-button-neutral'
  return <button type="button" title={accessibleTitle} aria-label={accessibleTitle} onClick={onClick} disabled={disabled} className={`action-button ${toneClass} inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40`}>{icon}{children}</button>
}

export function DataState({ loading, error, empty, onRetry, children }: { loading: boolean; error?: string; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div className="surface-panel flex min-h-48 items-center justify-center rounded-[24px] text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live data...</div>
  if (error) return <div className="surface-panel flex min-h-48 flex-col items-center justify-center rounded-[24px] p-6 text-center"><AlertTriangle className="h-6 w-6 text-purple-400" /><div className="mt-3 text-sm text-slate-900">Unable to load this view</div><div className="mt-1 max-w-xl text-xs text-slate-500">{error}</div>{onRetry && <div className="mt-4"><ActionButton onClick={onRetry}>Retry</ActionButton></div>}</div>
  if (empty) return <div className="surface-panel flex min-h-48 flex-col items-center justify-center rounded-[24px] p-6 text-center"><SlidersHorizontal className="h-6 w-6 text-slate-400" /><div className="mt-3 text-sm text-slate-900">No matching records</div><div className="mt-1 text-xs text-slate-500">Try another filter or create the first record.</div></div>
  return <>{children}</>
}

export function StatusBadge({ value }: { value: string | boolean }) {
  const raw = String(value)
  const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ')
  const good = value === true || ['active','connected','completed','transferred','success','enabled','approved','open','live','ready'].includes(normalized)
  const alert = ['failed','busy','no answer','canceled','disabled','unconfigured','missed'].includes(normalized)
  const label = normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
  return <span className={`premium-badge ${alert ? 'alert' : good ? 'live' : 'pending'}`}>{(good || alert) && <Check className="h-3 w-3" />}{label}</span>
}

export function FeatureSection({ title, description, features }: { title: string; description?: string; features: string[] }) {
  return <section className="product-feature-section surface-panel"><div className="product-feature-title">{title}</div>{description && <p className="product-feature-copy">{description}</p>}<div className="product-feature-list">{features.map((feature, index) => <span key={`${feature}-${index}`}>{feature}</span>)}</div></section>
}
