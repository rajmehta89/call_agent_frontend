'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import GlobalHeader from './GlobalHeader'
import { Loader, apiWithRetry } from './PlatformUI'
import { pageInfo } from './omni-data'

const publicRoutes = ['/login', '/signup', '/invite/accept']
function requiredPermission(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'view_dashboard'
  if (pathname.startsWith('/inbox') || pathname.startsWith('/tasks')) return 'handle_conversations'
  if (pathname.startsWith('/whatsapp') || pathname.startsWith('/conversation') || pathname.startsWith('/handoffs')) return 'handle_conversations'
  // Keep in step with the backend: these pages call APIs that need more than handle_calls.
  if (pathname.startsWith('/voice/agent')) return 'manage_agents'
  if (pathname.startsWith('/voice/providers') || pathname.startsWith('/voice/pricing')) return 'manage_integrations'
  if (pathname.startsWith('/voice') || pathname === '/calls') return 'handle_calls'
  if (pathname.startsWith('/brain/knowledge') || pathname.startsWith('/knowledge')) return 'manage_data'
  if (pathname.startsWith('/brain/tools') || pathname.startsWith('/brain/activity') || pathname.startsWith('/brain/shopify') || pathname.startsWith('/agents')) return 'manage_agents'
  if (pathname.startsWith('/customers')) return 'view_customers'
  if (pathname.startsWith('/leads')) return 'manage_assigned_leads'
  if (pathname.startsWith('/automations') || pathname.startsWith('/campaigns')) return 'manage_automations'
  if (pathname.startsWith('/integrations')) return 'manage_integrations'
  if (pathname.startsWith('/analytics')) return 'view_analytics'
  if (pathname.startsWith('/team')) return 'manage_team'
  if (pathname.startsWith('/settings/team')) return 'manage_team'
  if (pathname.startsWith('/settings/account')) return null  // everyone manages their own account
  if (pathname.startsWith('/settings') || pathname.startsWith('/config')) return 'manage_workspace'
  return null
}

function AccessState({ title, copy, action, href, onRetry }: { title: string; copy: string; action: string; href: string; onRetry?: () => void }) {
  return <div className="app-access-state"><section><span>RelayDesk</span><h1>{title}</h1><p>{copy}</p>
    {onRetry ? <><button type="button" onClick={onRetry}>Try again</button> <a href={href}>{action}</a></> : <a href={href}>{action}</a>}
  </section></div>
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = publicRoutes.some((route) => pathname?.startsWith(route))
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState('')
  const [authAttempt, setAuthAttempt] = useState(0)

  useEffect(() => {
    const { title } = pageInfo(pathname || '/')
    document.title = title ? `${title} · RelayDesk` : 'RelayDesk'
  }, [pathname])

  useEffect(() => {
    // On the sign-in pages there is no user; signing in (possibly as someone else) loads one afresh.
    if (isPublic) { setUser(null); return }
    if (!window.localStorage.getItem('agentflow_token')) { window.location.href = '/login'; return }
    let active = true
    // Match the backend's possible Render cold-start window so a sleeping
    // instance does not look like a broken or expired session.
    const timeout = window.setTimeout(() => { if (active) setAuthError('The workspace sign-in check took too long. Please try again in a moment.') }, 65000)
    setAuthError('')
    apiWithRetry<any>('/api/auth/me', undefined, 1, 60000).then((result) => {
      if (result.data?.token) window.localStorage.setItem('agentflow_token', result.data.token)
      if (active) setUser(result.data)
    }).catch(() => {
      // An expired session never gets here: a 401 already sends the browser to /login (authFetch).
      if (active) setAuthError('The workspace service is not answering right now. It may be starting up.')
    }).finally(() => window.clearTimeout(timeout))
    return () => { active = false; window.clearTimeout(timeout) }
  // Once per visit, not on every page change: each check was a round trip before the shell could refresh.
  }, [isPublic, authAttempt])

  if (isPublic) return <>{children}</>
  // No user yet and no error: still checking. Deciding from the user itself (not a separate "checking" flag) means
  // arriving from the sign-in page shows the loader, never a "Workspace unavailable" screen before the check starts.
  if (!user && !authError) return <div className="app-loading-state"><Loader label="Connecting to your workspace" className="w-full max-w-5xl" /></div>
  if (!user) return <AccessState title="Workspace unavailable" copy={authError} action="Sign in again" href="/login" onRetry={() => setAuthAttempt((attempt) => attempt + 1)} />
  const permission = requiredPermission(pathname || '/')
  const permissions = ['owner', 'admin'].includes(String(user.role || '').toLowerCase()) ? ['*'] : (user.permissions || [])
  const allowed = !permission || permissions.includes('*') || permissions.includes(permission)
  if (!allowed) return <AccessState title="Access restricted" copy="Your role does not have permission to open this page." action="Back to overview" href="/" />

  return <div className="app-shell"><Sidebar /><main className="app-main"><GlobalHeader user={user} /><div className="app-content">{children}</div></main></div>
}
