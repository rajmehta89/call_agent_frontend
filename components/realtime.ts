'use client'

import { API_BASE } from './PlatformUI'

/** One live connection per browser tab to the backend's event stream (backend realtime.py).
 *  Every event fires two window events:
 *    inbox:changed  sidebar counts and the notification bell reload
 *    inbox:refresh  the open inbox view reloads (detail: { kind, key })
 *  Read with fetch() rather than EventSource so it can send the ngrok-skip-browser-warning header (a backend behind
 *  free ngrok otherwise answers with a warning page). It reconnects after a drop; the "hello" on reconnect refreshes everything once. */

let controller: AbortController | null = null

function dispatch(data: string) {
  let event: { kind?: string; key?: string } = {}
  try { event = JSON.parse(data) } catch { return }
  if (event.kind === 'hello') console.info('[realtime] connected')
  else console.info('[realtime]', event.kind, event.key || '')
  window.dispatchEvent(new Event('inbox:changed'))
  window.dispatchEvent(new CustomEvent('inbox:refresh', { detail: event }))
}

export function startRealtime() {
  if (typeof window === 'undefined' || controller) return
  const token = window.localStorage.getItem('agentflow_token')
  if (!token) return
  const current = new AbortController()
  controller = current
  const retry = (seconds: number) => {
    if (controller !== current) return  // stopped, or a newer connection took over
    controller = null
    window.setTimeout(startRealtime, seconds * 1000)
  }
  fetch(`${API_BASE}/api/realtime/events?token=${encodeURIComponent(token)}`, { headers: { Accept: 'text/event-stream', 'ngrok-skip-browser-warning': 'true' }, signal: current.signal })
    .then(async (response) => {
      // A refused stream (e.g. expired sign-in) waits longer before trying again with a fresh token.
      if (!response.ok || !response.body) { console.warn(`[realtime] stream refused (${response.status})`); retry(10); return }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Server-sent events are separated by a blank line; each "data:" line carries the JSON.
        let end = buffer.search(/\r?\n\r?\n/)
        while (end >= 0) {
          const block = buffer.slice(0, end)
          buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, '')
          const data = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
          if (data) dispatch(data)
          end = buffer.search(/\r?\n\r?\n/)
        }
      }
      console.warn('[realtime] connection closed; reconnecting')
      retry(3)
    })
    .catch((error) => {
      if (current.signal.aborted) return
      console.warn('[realtime] connection lost; reconnecting', error)
      retry(3)
    })
}

export function stopRealtime() {
  controller?.abort()
  controller = null
}
