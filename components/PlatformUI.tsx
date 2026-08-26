'use client'

import { AlertTriangle, Check, Download, Loader2, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { ReactNode } from 'react'

export const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'https://call-agent-backend-ssrw.onrender.com'

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('agentflow_token') : null
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers || {}) } })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401 && typeof window !== 'undefined' && !['/login', '/signup', '/invite/accept'].some((route) => window.location.pathname.startsWith(route))) {
    window.localStorage.removeItem('agentflow_token')
    window.location.href = '/login'
  }
  if (!response.ok) throw new Error(payload?.detail?.error || payload?.detail || payload?.error || `Request failed (${response.status})`)
  return payload
}

export function downloadCsv(resource: string) { window.open(`${API_BASE}/api/platform/export/${resource}.csv`, '_blank') }

export function MetricGrid({ items }: { items: { label: string; value: string | number; detail?: string; tone?: string }[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <div key={item.label} className="surface-panel rounded-[20px] p-5"><div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{item.label}</div><div className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-slate-900">{item.value}</div>{item.detail && <div className="mt-2 text-xs text-slate-500">{item.detail}</div>}</div>)}</div>
}

export function Toolbar({ search, onSearch, onRefresh, onExport, children }: { search?: string; onSearch?: (value: string) => void; onRefresh?: () => void; onExport?: () => void; children?: ReactNode }) {
  return <div className="surface-panel flex flex-col gap-2.5 rounded-[22px] p-2.5 lg:flex-row lg:items-center">
    {onSearch && <div className="relative min-w-0 flex-1 lg:max-w-[440px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search records..." className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-10 text-sm shadow-none" />{search ? <button type="button" onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-slate-400 transition hover:text-slate-700"><X className="h-4 w-4" /></button> : null}</div>}
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 [&>input]:h-9 [&>input]:min-w-[150px] [&>input]:flex-1 [&>input]:rounded-md [&>input]:py-2 [&>select]:h-9 [&>select]:min-w-[180px] [&>select]:flex-1 [&>select]:rounded-md [&>select]:py-2 [&>button]:shrink-0">
      {children}
      {(onRefresh || onExport) && <div className="ml-auto flex shrink-0 items-center gap-2">{onRefresh && <ActionButton onClick={onRefresh} icon={<RefreshCw className="h-4 w-4" />}>Refresh</ActionButton>}{onExport && <ActionButton onClick={onExport} icon={<Download className="h-4 w-4" />}>Export CSV</ActionButton>}</div>}
    </div>
  </div>
}

export function ActionButton({ children, onClick, icon, primary = false, disabled = false }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; primary?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${primary ? 'bg-[#d97706] text-white shadow-[0_8px_16px_rgba(217,119,6,.18)] hover:brightness-105' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{icon}{children}</button>
}

export function DataState({ loading, error, empty, onRetry, children }: { loading: boolean; error?: string; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div className="surface-panel flex min-h-48 items-center justify-center rounded-[24px] text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live data...</div>
  if (error) return <div className="surface-panel flex min-h-48 flex-col items-center justify-center rounded-[24px] p-6 text-center"><AlertTriangle className="h-6 w-6 text-rose-400" /><div className="mt-3 text-sm text-slate-900">Unable to load this view</div><div className="mt-1 max-w-xl text-xs text-slate-500">{error}</div>{onRetry && <div className="mt-4"><ActionButton onClick={onRetry}>Retry</ActionButton></div>}</div>
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
  return <section className="surface-panel rounded-[24px] p-6"><div className="text-lg font-bold tracking-[-.03em] text-slate-900">{title}</div>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}<div className="mt-5 flex flex-wrap gap-2">{features.map((feature) => <span key={feature} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{feature}</span>)}</div></section>
}
