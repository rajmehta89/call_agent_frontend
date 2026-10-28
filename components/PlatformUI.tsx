'use client'

import { AlertTriangle, CalendarDays, Check, CheckCircle2, Download, Loader2, LucideIcon, PhoneIncoming, PhoneMissed, Search, SlidersHorizontal, Timer, Users, X } from 'lucide-react'
import { ReactNode } from 'react'
import { Skeleton, Stat } from './premium'

export const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'http://127.0.0.1:8000'

/** What people see for a role. "agent" is the Team member role's internal name (auth_service.DEFAULT_ROLES). */
const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', agent: 'Team member' }
/** People's names as entered may be lowercase ("raj mehta"); show them in title case everywhere. */
export const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export const roleLabel = (role?: string) => ROLE_LABELS[String(role || 'agent').toLowerCase()] || 'Team member'
/** Built-in owner/admin roles always have full access, even while an older API is refreshing permissions. */

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

const PUBLIC_PAGES = ['/login', '/signup', '/verify-email', '/invite/accept']

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
  // ngrok's free plan answers browser requests with a warning page unless this header is sent (harmless elsewhere).
  const response = await fetch(url, { ...options, headers: { 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
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

/** Icon for a stat from its label, so every page's numbers look the same without passing icons around. */
const metricIcon = (label: string): LucideIcon => {
  const text = label.toLowerCase()
  if (/today|date/.test(text)) return CalendarDays
  if (/duration|avg|time/.test(text)) return Timer
  if (/complete|answered|converted|success/.test(text)) return CheckCircle2
  if (/fail|miss|lost/.test(text)) return PhoneMissed
  if (/lead|people|member|contact/.test(text)) return Users
  return PhoneIncoming
}

export function MetricGrid({ items }: { items: { label: string; value: string | number; detail?: string; tone?: string; href?: string }[] }) {
  return <div className="keep-cols grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{items.map((item) => <Stat key={item.label} icon={metricIcon(item.label)} label={item.label} value={item.value} hint={item.detail} href={item.href} />)}</div>
}

export function Toolbar({ search, onSearch, onExport, children }: { search?: string; onSearch?: (value: string) => void; onExport?: () => void; children?: ReactNode }) {
  return <div className="product-toolbar surface-panel flex flex-col gap-2.5 lg:flex-row lg:items-center">
    {onSearch && <div className="product-toolbar-search relative min-w-0 flex-1 lg:max-w-[440px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search records..." aria-label="Search records" />{search ? <button type="button" onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full transition"><X className="h-4 w-4" /></button> : null}</div>}
    <div className="product-toolbar-controls flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {children}
      {onExport && <div className="ml-auto flex shrink-0 items-center gap-2">{onExport && <ActionButton onClick={onExport} icon={<Download className="h-4 w-4" />}>Export CSV</ActionButton>}</div>}
    </div>
  </div>
}

export function ActionButton({ children, onClick, icon, primary = false, disabled = false, title, tone = 'default', type = 'button' }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; primary?: boolean; disabled?: boolean; title?: string; tone?: 'default' | 'warning' | 'danger' | 'success'; type?: 'button' | 'submit' }) {
  const accessibleTitle = title || (typeof children === 'string' ? children : undefined)
  const toneClass = primary ? 'action-button-primary' : tone === 'warning' ? 'action-button-warning' : tone === 'danger' ? 'action-button-danger' : tone === 'success' ? 'action-button-success' : 'action-button-neutral'
  return <button type={type} title={accessibleTitle} aria-label={accessibleTitle} onClick={onClick} disabled={disabled} className={`action-button ${toneClass} inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40`}>{icon}{children}</button>
}

/** The one loading state for every page and panel: lavender shimmer blocks shaped like what is coming, announced to
    screen readers. "page" = stat cards and a panel, "panel" = an open conversation or record, "rows" = a list,
    "cards" = a row of stat or product cards, "line" = one small item (a recording, a count). `count` sets how many
    rows or cards. Busy buttons use Spinner instead. */
export function Loader({ label = 'Loading', variant = 'page', count, className = '' }: { label?: string; variant?: 'page' | 'panel' | 'rows' | 'cards' | 'line'; count?: number; className?: string }) {
  const many = (fallback: number) => Array.from({ length: count || fallback }, (_, index) => index)
  return <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}…</span>
    {variant === 'page' ? <div aria-hidden="true" className="space-y-4"><div className="keep-cols grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-[104px]" />)}</div><Skeleton className="h-72" /></div>
      : variant === 'panel' ? <div aria-hidden="true" className="space-y-4 p-4"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div><Skeleton className="h-20" /><Skeleton className="h-14 w-4/5" /><Skeleton className="ml-auto h-14 w-3/5" /><Skeleton className="h-14 w-2/3" /></div>
      : variant === 'cards' ? <div aria-hidden="true" className="keep-cols grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">{many(4).map((index) => <Skeleton key={index} className="h-[104px]" />)}</div>
      : variant === 'line' ? <Skeleton className="h-10" />
      : <div aria-hidden="true" className="space-y-1">{many(4).map((index) => <div key={index} className="flex items-center gap-3 rounded-xl p-2"><Skeleton className="h-9 w-9 shrink-0 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2.5 w-1/2" /></div></div>)}</div>}
  </div>
}

/** The one busy indicator for buttons and inline "working" states: the same icon, size and motion everywhere.
    Decorative (the button's own text or label says what is happening); motion stops for reduced-motion users. */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-7 w-7' : 'h-4 w-4'
  return <Loader2 aria-hidden="true" className={`${box} shrink-0 animate-spin motion-reduce:animate-none ${className}`} />
}

export function DataState({ loading, error, empty, onRetry, children }: { loading: boolean; error?: string; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <Loader />
  if (error) return <div className="surface-panel flex min-h-48 flex-col items-center justify-center rounded-[24px] p-6 text-center"><AlertTriangle className="h-6 w-6 text-purple-600" /><div className="mt-3 text-sm text-slate-900">Unable to load this view</div><div className="mt-1 max-w-xl text-xs text-slate-500">{error}</div>{onRetry && <div className="mt-4"><ActionButton onClick={onRetry}>Retry</ActionButton></div>}</div>
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
