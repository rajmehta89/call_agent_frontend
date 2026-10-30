// Isolated Chromium checks against a locally built app. Every API is intercepted
// with synthetic records; this browser never sends a request to a real backend.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const origin = process.env.CRM_REVIEW_ORIGIN || 'http://127.0.0.1:3107'
const output = process.env.CRM_REVIEW_OUTPUT || path.join(tmpdir(), 'crm-review-ui')
await mkdir(output, { recursive: true })
const profile = await mkdtemp(path.join(tmpdir(), 'crm-review-browser-'))
const executable = process.env.CRM_REVIEW_BROWSER
if (!executable) throw new Error('Set CRM_REVIEW_BROWSER to a Chromium or Chrome executable for the isolated browser checks.')
const browser = spawn(executable, ['--remote-debugging-port=9237', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--disable-gpu', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let connection
const pending = new Map()
let sequence = 0
const errors = [], requests = [], checks = []
function send(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    connection.send(JSON.stringify({ id, method, params }))
  })
}
const user = { id: 'review-admin', name: 'Review Admin', email: 'review@example.invalid', role: 'admin', workspace_id: 'default', workspace_name: 'Synthetic review workspace', permissions: ['*'], token: 'synthetic-review-token' }
const leads = Array.from({ length: 250 }, (_, i) => ({ _id: (i + 1).toString(16).padStart(24, '0'), id: (i + 1).toString(16).padStart(24, '0'), name: i === 249 ? 'Archived caller 249' : `Review caller ${String(i).padStart(3, '0')}`, phone: `+1555${String(i).padStart(7, '0')}`, email: `caller${i}@example.invalid`, company: 'Synthetic example', status: 'new', preferred_language: 'en', assigned_to: i % 2 ? 'agent-a' : undefined, created_at: '2026-10-29T10:00:00Z', last_call: '2026-10-29T10:00:00Z', call_attempts: 1 }))
const calls = leads.map((lead, i) => ({ _id: (i + 1001).toString(16).padStart(24, '0'), lead_id: lead._id, lead, phone_number: lead.phone, call_date: '2026-10-29T10:00:00Z', updated_at: '2026-10-29T10:01:00Z', created_at: lead.created_at, status: 'completed', direction: 'inbound', duration: 60, provider: 'retell', call_summary: `Synthetic follow-up for ${lead.name}.`, messages: [], transcription: [], ai_responses: [] }))
const threads = leads.map(lead => ({ key: lead.phone, name: lead.name, phone: lead.phone, status: 'completed', last_at: '2026-10-29T10:00:00Z', stage_at: '2026-10-29T10:01:00Z', stage: 'follow_up', closed: false, failed: false, live: false, assigned_to: lead.assigned_to, assigned_to_name: lead.assigned_to ? 'Review Agent' : undefined, summary: 'Synthetic follow-up: confirm the next appointment.', call_count: 1 }))
function page(rows, url) {
  const start = Number(url.searchParams.get('after') || 0), limit = Number(url.searchParams.get('limit') || 200)
  return { success: true, data: rows.slice(start, start + limit), total: rows.length, next_cursor: start + limit < rows.length ? String(start + limit) : null }
}
function fixture(url) {
  const route = url.pathname, q = url.searchParams
  if (route === '/api/auth/me') return { success: true, data: user }
  if (route === '/api/inbox/members') return { success: true, me: user.id, can_assign: true, data: [{ id: 'agent-a', name: 'Review Agent', email: 'agent@example.invalid', role: 'agent', assignable: true }] }
  if (route === '/api/inbox/counts') return { success: true, data: { all: 250, unassigned: 125, assigned: 125, mine: 0, 'stage:follow_up': 250 } }
  if (route === '/api/platform/notifications') return { success: true, data: [], unread: 0 }
  if (route === '/api/leads/stats') return { success: true, data: { total: 250, new: 250, called: 0, contacted: 0, converted: 0, total_calls: 250, assigned: 125, unassigned: 125 } }
  if (route === '/api/leads/' || route === '/api/leads') {
    let rows = leads.filter(lead => !q.get('search') || lead.name.toLowerCase().includes(q.get('search').toLowerCase()))
    if (q.get('status')) rows = rows.filter(lead => lead.status === q.get('status'))
    return page(rows, url)
  }
  if (route === '/api/calls') {
    let rows = calls.filter(call => !q.get('search') || call.lead.name.toLowerCase().includes(q.get('search').toLowerCase()))
    if (q.get('status')) rows = rows.filter(call => call.status === q.get('status'))
    return { ...page(rows, url), summary: { total: rows.length, completed: rows.length, missed: 0, average_duration: 60 } }
  }
  if (route.startsWith('/api/calls/')) return { success: true, data: calls.find(call => route.endsWith(call._id)) || calls[0] }
  if (route === '/api/inbox/conversations') {
    let rows = threads.filter(row => !q.get('stage') || row.stage === q.get('stage'))
    if (q.get('state') === 'closed') rows = []
    if (q.get('folder') === 'mine') rows = rows.filter(row => row.assigned_to === user.id)
    if (q.get('folder') === 'unassigned') rows = rows.filter(row => !row.assigned_to)
    if (q.get('folder') === 'assigned') rows = rows.filter(row => row.assigned_to)
    if (q.get('search')) rows = rows.filter(row => row.name.toLowerCase().includes(q.get('search').toLowerCase()))
    const counts = { all: rows.length, assigned: rows.filter(row => row.assigned_to).length, unassigned: rows.filter(row => !row.assigned_to).length, missed: 0, live: 0, new_today: rows.length }
    if (q.get('list_filter') === 'assigned') rows = rows.filter(row => row.assigned_to)
    if (q.get('list_filter') === 'unassigned') rows = rows.filter(row => !row.assigned_to)
    if (q.get('order') === 'asc') rows = [...rows].reverse()
    return { ...page(rows, url), filter_counts: counts }
  }
  if (route.startsWith('/api/inbox/conversations/')) {
    const row = threads.find(row => route.endsWith(encodeURIComponent(row.key)) || route.endsWith(row.key)) || threads[0]
    return { success: true, data: { ...row, calls: [], discussion: [], events: [], profile: { name: row.name, phone: row.phone } } }
  }
  return { success: true, data: [] }
}
async function intercept(event) {
  const { requestId, request } = event
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) {
    requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) })
    const headers = [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,OPTIONS' }]
    const status = request.method === 'OPTIONS' ? 204 : url.pathname === '/api/realtime/events' ? 503 : 200
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: headers, body: Buffer.from(status === 204 ? '' : JSON.stringify(fixture(url))).toString('base64') })
  } else if (url.origin === origin || url.protocol === 'data:') await send('Fetch.continueRequest', { requestId })
  else await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result?.value
}
async function until(expression, description) {
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(document.body && (${expression}))`)) return; await sleep(100) }
  const body = await evaluate('document.body.innerText.slice(-2000)')
  throw new Error(`Timed out: ${description}; body: ${body}`)
}
async function click(text) {
  const clicked = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === ${JSON.stringify(text)}); if (!b || b.disabled) return false; b.click(); return true })()`)
  if (!clicked) throw new Error(`Button unavailable: ${text}`)
}
async function fill(label, value) {
  await evaluate(`(() => { const input = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!input) throw new Error('Missing input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path.join(output, `${name}.png`), Buffer.from(result.data, 'base64'))
}
try {
  let target
  for (let attempt = 0; attempt < 100; attempt++) {
    try { target = (await (await fetch('http://127.0.0.1:9237/json/list')).json()).find(row => row.type === 'page'); if (target) break } catch {}
    await sleep(100)
  }
  if (!target) throw new Error('Private headless browser did not start')
  connection = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { connection.addEventListener('open', resolve, { once: true }); connection.addEventListener('error', reject, { once: true }) })
  connection.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data)
    if (event.id) { const task = pending.get(event.id); pending.delete(event.id); if (event.error) task?.reject(new Error(event.error.message)); else task?.resolve(event.result) }
    else if (event.method === 'Fetch.requestPaused') intercept(event.params).catch(error => errors.push(error.message))
    else if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text)
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('agentflow_token', 'synthetic-review-token')` })
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    for (const route of ['inbox', 'tasks', 'leads', 'calls']) {
      await send('Page.navigate', { url: `${origin}/${route}` })
      await until(`document.body.innerText.includes('100 of 250')`, `${device} ${route} initial page`)
      await screenshot(`${device}-${route}`)
      const noun = route === 'inbox' ? 'conversations' : route
      await click(`Load more ${noun}`)
      await until(`document.body.innerText.includes('200 of 250')`, `${route} second page`)
      await click(`Load more ${noun}`)
      await until(`document.body.innerText.includes('250 of 250')`, `${route} final page`)
      checks.push(`${device}: ${route} reaches all 250 records`)
      if (route === 'leads' || route === 'calls') {
        await fill(route === 'leads' ? 'Search leads' : 'Search records', 'Archived caller 249')
        await until(`document.body.innerText.includes('1 of 1') && document.body.innerText.includes('Archived caller 249')`, `${route} finds an older caller`)
        checks.push(`${device}: ${route} searches beyond the first page`)
      }
      if (route === 'inbox') {
        await evaluate(`(() => { const b=[...document.querySelectorAll('button[role="tab"]')].find(b => b.innerText.startsWith('No owner') || b.innerText.startsWith('Unassigned')); b.click() })()`)
        await until(`document.body.innerText.includes('100 of 125')`, 'server quick filter')
        checks.push(`${device}: Inbox quick filter uses full dataset totals`)
      }
      const overflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')
      if (overflow) throw new Error(`${device}: ${route} has horizontal viewport overflow`)
    }
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, errors, apiRequestsIntercepted: requests.length, syntheticDataOnly: true }, null, 2))
  console.log(JSON.stringify({ checks, errors, apiRequestsIntercepted: requests.length, screenshots: output }, null, 2))
} finally {
  try { if (connection?.readyState === WebSocket.OPEN) await send('Browser.close') } catch {}
  connection?.close(); browser.kill()
}
