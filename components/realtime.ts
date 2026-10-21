'use client'

import { API_BASE } from './PlatformUI'

/** One live connection per browser tab to the backend's event stream (backend realtime.py).
 *  Every event fires two window events:
 *    inbox:changed  sidebar counts and the notification bell reload
 *    inbox:refresh  the open inbox view reloads (detail: { kind, key })
 *  The browser reconnects by itself after a network drop; on reconnect everything refreshes once. */

let source: EventSource | null = null

export function startRealtime() {
  if (typeof window === 'undefined' || source || typeof EventSource === 'undefined') return
  const token = window.localStorage.getItem('agentflow_token')
  if (!token) return
  source = new EventSource(`${API_BASE}/api/realtime/events?token=${encodeURIComponent(token)}`)
  source.onmessage = (message) => {
    let event: { kind?: string; key?: string } = {}
    try { event = JSON.parse(message.data) } catch { return }
    if (event.kind === 'hello') console.info('[realtime] connected')
    else console.info('[realtime]', event.kind, event.key || '')
    window.dispatchEvent(new Event('inbox:changed'))
    window.dispatchEvent(new CustomEvent('inbox:refresh', { detail: event }))
  }
  source.onerror = () => {
    console.warn('[realtime] connection lost; the browser will reconnect')
    // A closed stream (e.g. expired sign-in) is not retried by the browser: try again later with a fresh token.
    if (source?.readyState === EventSource.CLOSED) { source = null; window.setTimeout(startRealtime, 10000) }
  }
}

export function stopRealtime() {
  source?.close()
  source = null
}
