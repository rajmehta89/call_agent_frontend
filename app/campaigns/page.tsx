'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCheck, ExternalLink, MailCheck, Save, Send, ShieldCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { api, userFacingError } from '@/components/PlatformUI'

const CAMPAIGN = 'Dubai voice WhatsApp CRM outreach'

type Draft = {
  _id: string
  lead_id?: string
  company_name: string
  recipient_email: string
  subject: string
  body: string
  status: string
  verification_url?: string
  website?: string
  requires_explicit_approval?: boolean
  sent_at?: string
  delivery?: { from?: string; provider?: string }
}

type Summary = { total: number; needs_verification: number; pending_approval: number; sent: number }
type Sender = { connected: boolean; address: string; provider: string; setup_required: boolean }
type InboxMessage = { from: string; subject: string; date: string; unread: boolean }
type Prospect = { lead_id: string; company_name: string; industry: string; priority: string; subject: string; body: string; research_email?: string; research_source_url?: string }

export default function CampaignsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [sentDrafts, setSentDrafts] = useState<Draft[]>([])
  const [queuedDrafts, setQueuedDrafts] = useState<Draft[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [historyPage, setHistoryPage] = useState(0)
  const [sender, setSender] = useState<Sender | null>(null)
  const [senderVerified, setSenderVerified] = useState(false)
  const [verifyingSender, setVerifyingSender] = useState(false)
  const [inbox, setInbox] = useState<InboxMessage[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxError, setInboxError] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [index, setIndex] = useState(0)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectTotal, setProspectTotal] = useState(0)
  const [prospectOffset, setProspectOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [prospectSubject, setProspectSubject] = useState('')
  const [prospectBody, setProspectBody] = useState('')

  function selectProspect(prospect: Prospect | null) {
    setSelected(prospect)
    setProspectSubject(prospect?.subject || '')
    setProspectBody(prospect?.body || '')
    setVerifiedEmail('')
    setSourceUrl('')
  }

  const loadProspects = useCallback(async (term: string, offset = 0, selectLast = false) => {
    const result = await api<{ data: { items: Prospect[]; total: number } }>(`/api/platform/dubai-prospects?search=${encodeURIComponent(term)}&offset=${offset}&limit=20`)
    setProspects(result.data.items)
    setProspectTotal(result.data.total)
    setProspectOffset(offset)
    const first = (selectLast ? result.data.items.at(-1) : result.data.items[0]) || null
    setSelected(first)
    setProspectSubject(first?.subject || '')
    setProspectBody(first?.body || '')
    setVerifiedEmail('')
    setSourceUrl('')
  }, [])

  const load = useCallback(async () => {
    try {
      const [outbox, overview, senderStatus] = await Promise.all([
        api<{ data: Draft[] }>(`/api/platform/email-outbox?campaign_name=${encodeURIComponent(CAMPAIGN)}&limit=1000`),
        api<{ data: Summary }>('/api/platform/dubai-prospects/summary'),
        api<{ data: Sender }>('/api/platform/private-email/status'),
      ])
      const pending = outbox.data.filter((draft) => draft.status === 'awaiting_owner_review' || (draft.status === 'pending_approval' && draft.requires_explicit_approval))
      pending.sort((a, b) => (a.lead_id || a.company_name).localeCompare(b.lead_id || b.company_name))
      setDrafts(pending)
      setSelectedDraftIds((current) => new Set(Array.from(current).filter((id) => pending.some((item) => item._id === id))))
      setSentDrafts(outbox.data.filter((item) => item.status === 'sent').sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || '')))
      setQueuedDrafts(outbox.data.filter((item) => item.status === 'approved' || item.status === 'scheduled'))
      setSummary(overview.data)
      setSender(senderStatus.data)
      if (senderStatus.data.connected) {
        try {
          const messages = await api<{ data: InboxMessage[] }>('/api/platform/private-email/inbox')
          setInbox(messages.data)
          setInboxError('')
        } catch (cause) { setInboxError(userFacingError(cause, 'Could not load inbox.')) }
      }
      await loadProspects('')
      setIndex((current) => {
        const requested = new URLSearchParams(window.location.search).get('draft_id')
        const match = requested ? pending.findIndex((draft) => draft._id === requested) : -1
        return match >= 0 ? match : Math.min(current, Math.max(0, pending.length - 1))
      })
      setError('')
    } catch (cause) {
      setError(userFacingError(cause, 'Could not load the email review queue.'))
    } finally {
      setLoading(false)
    }
  }, [loadProspects])

  useEffect(() => { load() }, [load])
  const draft = drafts[index]
  useEffect(() => {
    setSubject(draft?.subject || '')
    setBody(draft?.body || '')
  }, [draft?._id, draft?.subject, draft?.body])
  useEffect(() => {
    setProspectSubject(selected?.subject || '')
    setProspectBody(selected?.body || '')
  }, [selected?.lead_id, selected?.subject, selected?.body])
  const changed = !!draft && (subject !== draft.subject || body !== draft.body)

  async function saveCopy() {
    if (!draft || !subject.trim() || !body.trim()) return
    setBusy(true)
    try {
      await api(`/api/platform/email-outbox/${draft._id}/copy`, {
        method: 'PUT', body: JSON.stringify({ value: { subject: subject.trim(), body: body.trim() } }),
      })
      setDrafts((current) => current.map((item) => item._id === draft._id ? { ...item, subject: subject.trim(), body: body.trim() } : item))
      toast.success('Draft saved. It still needs your approval.')
    } catch (cause) { toast.error(userFacingError(cause)) } finally { setBusy(false) }
  }

  async function decide(decision: 'approve' | 'exclude') {
    if (!draft || changed) return
    setBusy(true)
    try {
      const result = await api<{ data: { status: string } }>(`/api/platform/email-outbox/${draft._id}/decision`, {
        method: 'PUT', body: JSON.stringify({ value: { decision } }),
      })
      toast.success(decision === 'exclude' ? 'Draft excluded' : result.data.status === 'sent' ? 'Email sent' : 'Approved and queued for sending')
      window.history.replaceState(null, '', '/campaigns')
      await load()
    } catch (cause) { toast.error(userFacingError(cause)) } finally { setBusy(false) }
  }

  function toggleDraft(id: string) {
    setSelectedDraftIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllDrafts() {
    setSelectedDraftIds((current) => current.size === drafts.length ? new Set() : new Set(drafts.map((item) => item._id)))
  }

  async function bulkSend() {
    if (!selectedDraftIds.size || !senderVerified || changed || bulkBusy) return
    if (!window.confirm(`Approve and send ${selectedDraftIds.size} reviewed email${selectedDraftIds.size === 1 ? '' : 's'} now?`)) return
    setBulkBusy(true)
    try {
      const result = await api<{ data: { sent: number; queued: number; failed: number } }>('/api/platform/email-outbox/bulk-decision', {
        method: 'PUT', body: JSON.stringify({ value: { decision: 'approve', draft_ids: Array.from(selectedDraftIds) } }),
      })
      const { sent, queued, failed } = result.data
      toast.success(failed ? `${sent} sent, ${queued} queued, ${failed} failed` : queued ? `${sent} sent and ${queued} queued` : `${sent} email${sent === 1 ? '' : 's'} sent`)
      setSelectedDraftIds(new Set())
      await load()
    } catch (cause) { toast.error(userFacingError(cause)) } finally { setBulkBusy(false) }
  }

  async function prepareDraft() {
    if (!selected || !verifiedEmail.trim() || !sourceUrl.trim()) return
    setBusy(true)
    try {
      const result = await api<{ data: { id: string } }>(`/api/platform/dubai-prospects/${selected.lead_id}/draft`, {
        method: 'POST', body: JSON.stringify({ value: { email: verifiedEmail.trim(), source_url: sourceUrl.trim(), subject: prospectSubject.trim(), body: prospectBody.trim() } }),
      })
      toast.success('Draft prepared. Review it above before sending.')
      selectProspect(null)
      window.history.replaceState(null, '', `/campaigns?draft_id=${result.data.id}`)
      await load()
    } catch (cause) { toast.error(userFacingError(cause)) } finally { setBusy(false) }
  }

  async function verifySender() {
    setVerifyingSender(true)
    try {
      await api('/api/platform/private-email/verify', { method: 'POST' })
      setSenderVerified(true)
      toast.success('Private Email login verified')
      await loadInbox()
    } catch (cause) {
      setSenderVerified(false)
      toast.error(userFacingError(cause))
    } finally { setVerifyingSender(false) }
  }

  async function loadInbox() {
    setInboxLoading(true)
    try {
      const result = await api<{ data: InboxMessage[] }>('/api/platform/private-email/inbox')
      setInbox(result.data)
      setInboxError('')
    } catch (cause) { setInboxError(userFacingError(cause, 'Could not load inbox.')) } finally { setInboxLoading(false) }
  }

  const source = draft?.verification_url || draft?.website
  const matchingSent = sentDrafts.filter((item) => `${item.company_name} ${item.recipient_email}`.toLowerCase().includes(historySearch.trim().toLowerCase()))
  const historyPageCount = Math.max(1, Math.ceil(matchingSent.length / 25))
  const safeHistoryPage = Math.min(historyPage, historyPageCount - 1)
  const visibleSent = matchingSent.slice(safeHistoryPage * 25, (safeHistoryPage + 1) * 25)
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <PageHeader title="Email review" description="Review Dubai outreach emails, then approve and send one or many selected drafts." icon={MailCheck} />

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#E9DFFF] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Ready for your review</p><p className="mt-1 text-2xl font-bold text-[#32136B]">{summary?.pending_approval ?? '—'}</p></div>
      <div className="rounded-2xl border border-[#E9DFFF] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Need a verified email</p><p className="mt-1 text-2xl font-bold text-[#32136B]">{summary?.needs_verification ?? '—'}</p></div>
      <div className="rounded-2xl border border-[#E9DFFF] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Sent from this campaign</p><p className="mt-1 text-2xl font-bold text-[#32136B]">{summary?.sent ?? '—'}</p></div>
    </div>

    <section className="rounded-2xl border border-[#E9DFFF] bg-white p-5" aria-label="Dubai email sender">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-[#32136B]">Dubai email sender</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${senderVerified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{senderVerified ? 'Login verified' : sender?.connected ? 'Credentials set · verify login' : 'Needs server setup'}</span></div>
      <p className="mt-2 text-sm text-slate-700">{sender?.address || 'raj@buildwithraj.com'} via Namecheap Private Email</p>
      {!sender?.connected && <p className="mt-2 text-xs leading-5 text-amber-800">Webmail is active. To send from this workspace, add PRIVATE_EMAIL_PASSWORD to the backend server environment, then restart the backend. Keep the password out of chat and the browser. Drafts remain available for review.</p>}
      {sender?.connected && <button type="button" disabled={verifyingSender} onClick={verifySender} className="mt-3 rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B] disabled:opacity-40">{verifyingSender ? 'Checking login…' : 'Verify mailbox login'}</button>}
    </section>

    {loading ? <div className="h-80 animate-pulse rounded-2xl bg-[#F8F5FF]" aria-label="Loading email drafts" /> : error ?
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></div> :
      !draft ? <div className="rounded-2xl border border-[#E9DFFF] bg-white p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#6C3BFF]" /><h2 className="mt-3 text-lg font-bold text-[#32136B]">No emails waiting for approval</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">The remaining prospects need verified public business email addresses before a draft can appear here. Nothing is sent from those rows.</p></div> :
      <section className="overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white" aria-label="Email awaiting review">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9DFFF] bg-[#F8F5FF] px-5 py-4">
          <div><p className="text-xs font-semibold text-[#6C3BFF]">Email {index + 1} of {drafts.length} awaiting approval</p><h2 className="mt-1 text-lg font-bold text-[#32136B]">{draft.company_name}</h2></div>
          <div className="flex items-center gap-2"><button type="button" aria-label="Previous email" disabled={index === 0 || busy || changed} onClick={() => setIndex(index - 1)} className="rounded-lg border border-[#D8C8FF] p-2 text-[#32136B] hover:bg-white disabled:opacity-40"><ArrowLeft className="h-4 w-4" /></button><button type="button" aria-label="Next email" disabled={index >= drafts.length - 1 || busy || changed} onClick={() => setIndex(index + 1)} className="rounded-lg border border-[#D8C8FF] p-2 text-[#32136B] hover:bg-white disabled:opacity-40"><ArrowRight className="h-4 w-4" /></button></div>
        </div>
        <div className="border-b border-[#E9DFFF] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#32136B]"><input type="checkbox" checked={drafts.length > 0 && selectedDraftIds.size === drafts.length} onChange={toggleAllDrafts} className="h-4 w-4 rounded border-[#BBA6F5] text-[#6C3BFF] focus:ring-[#6C3BFF]" />Select all awaiting review</label>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{selectedDraftIds.size} selected</span><button type="button" disabled={!selectedDraftIds.size || !senderVerified || changed || bulkBusy} onClick={bulkSend} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C3BFF] px-3 text-xs font-semibold text-white hover:bg-[#5A2BE6] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" />{bulkBusy ? 'Sending selected…' : 'Approve selected & send'}</button></div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">Open each draft with the arrows, review or save edits, then select the drafts you want to send. Sending still follows the campaign rate limit and delivery window.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {drafts.map((item, draftIndex) => <div key={item._id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${item._id === draft._id ? 'border-[#A98BFF] bg-[#F8F5FF]' : 'border-[#E9DFFF] bg-white'}`}>
              <input type="checkbox" aria-label={`Select ${item.company_name}`} checked={selectedDraftIds.has(item._id)} onChange={() => toggleDraft(item._id)} className="h-4 w-4 shrink-0 rounded border-[#BBA6F5] text-[#6C3BFF] focus:ring-[#6C3BFF]" />
              <button type="button" onClick={() => setIndex(draftIndex)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-slate-900">{item.company_name}</span><span className="block truncate text-xs text-slate-600">{item.recipient_email}</span></button>
            </div>)}
          </div>
          {!senderVerified && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800"><CheckCheck className="h-3.5 w-3.5" />Verify the sender mailbox above before sending selected emails.</p>}
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="font-semibold text-slate-500">To</span><p className="mt-1 break-all font-medium text-slate-900">{draft.recipient_email}</p><span className="mt-2 block font-semibold text-slate-500">From</span><p className="mt-1 break-all font-medium text-slate-900">{sender?.address || 'raj@buildwithraj.com'}</p></div><div><span className="font-semibold text-slate-500">Address source</span><p className="mt-1">{source ? <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-medium text-[#5A2BE6] underline underline-offset-2">Official contact page <ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : <span className="text-slate-600">Source unavailable</span>}</p></div></div>
          <label className="block text-sm font-semibold text-slate-700">Subject<input value={subject} maxLength={180} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-xl border border-[#D8C8FF] bg-white px-3 py-2.5 font-normal text-slate-900" /></label>
          <label className="block text-sm font-semibold text-slate-700">Email body<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={15} className="mt-2 w-full resize-y rounded-xl border border-[#D8C8FF] bg-white px-3 py-3 font-normal leading-6 text-slate-900" /></label>
          {changed && <p className="text-xs font-medium text-amber-800">Save your edits before approving this email.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E9DFFF] bg-[#FAF9FF] px-5 py-4 sm:px-6">
          <button type="button" disabled={busy || changed} onClick={() => decide('exclude')} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><X className="h-4 w-4" />Exclude</button>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !changed || !subject.trim() || !body.trim()} onClick={saveCopy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8C8FF] px-4 text-sm font-semibold text-[#32136B] hover:bg-white disabled:opacity-40"><Save className="h-4 w-4" />Save edits</button><button type="button" disabled={busy || !senderVerified || changed || !subject.trim() || !body.trim()} onClick={() => decide('approve')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white hover:bg-[#5A2BE6] disabled:opacity-40"><Check className="h-4 w-4" />Approve &amp; send</button></div>
        </div>
      </section>}

    <section className="rounded-2xl border border-[#E9DFFF] bg-white p-5 sm:p-6" aria-label="Dubai email delivery history">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#32136B]">Dubai email activity</h2><p className="mt-1 text-sm text-slate-600">{queuedDrafts.length} approved and queued · {sentDrafts.length} sent from this campaign</p></div><button type="button" onClick={load} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B] hover:bg-[#F8F5FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3BFF]">Refresh activity</button></div>
      {queuedDrafts.length > 0 && <div className="mt-4 rounded-xl bg-[#F8F5FF] p-4"><h3 className="text-sm font-bold text-[#32136B]">Approved and waiting to send</h3><p className="mt-1 text-xs text-slate-600">These messages send automatically as campaign capacity becomes available.</p><div className="mt-2 divide-y divide-[#E9DFFF]">{queuedDrafts.map((item) => <div key={item._id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="font-medium text-slate-900">{item.company_name}</span><span className="break-all text-slate-600">{item.recipient_email}</span></div>)}</div></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-[#32136B]">Sent messages</h3><input type="search" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(0) }} placeholder="Search company or email" aria-label="Search sent Dubai emails" className="w-full rounded-lg border border-[#D8C8FF] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C3BFF] sm:w-64" /></div>
      {matchingSent.length === 0 ? <p className="mt-3 text-sm text-slate-600">{sentDrafts.length ? 'No sent messages match your search.' : 'No sent emails recorded for this campaign.'}</p> : <div className="mt-2 divide-y divide-[#E9DFFF]">{visibleSent.map((item) => <div key={item._id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div className="min-w-0"><p className="font-semibold text-slate-900">{item.company_name}</p><p className="break-all text-slate-600">{item.recipient_email}</p><p className="text-xs text-slate-500">From {item.delivery?.from || 'previous sender'}</p></div><p className="shrink-0 text-xs tabular-nums text-slate-500">{item.sent_at ? new Date(item.sent_at).toLocaleString() : 'Sent'}</p></div>)}</div>}
      {matchingSent.length > 25 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E9DFFF] pt-4 text-xs text-slate-600"><span>Showing {safeHistoryPage * 25 + 1}–{Math.min((safeHistoryPage + 1) * 25, matchingSent.length)} of {matchingSent.length}</span><div className="flex gap-2"><button type="button" disabled={safeHistoryPage === 0} onClick={() => setHistoryPage(safeHistoryPage - 1)} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 font-semibold text-[#32136B] disabled:opacity-40">Previous</button><button type="button" disabled={safeHistoryPage >= historyPageCount - 1} onClick={() => setHistoryPage(safeHistoryPage + 1)} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 font-semibold text-[#32136B] disabled:opacity-40">Next</button></div></div>}
    </section>

    <section className="rounded-2xl border border-[#E9DFFF] bg-white p-5 sm:p-6" aria-label="Business email inbox">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-[#32136B]">Business email inbox</h2><div className="flex gap-2"><button type="button" disabled={!sender?.connected || inboxLoading} onClick={loadInbox} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B] disabled:opacity-40">{inboxLoading ? 'Loading…' : 'Refresh inbox'}</button><a href="https://privateemail.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B]">Open Webmail</a></div></div>
      <p className="mt-1 text-xs text-slate-600">Recent messages received by {sender?.address || 'raj@buildwithraj.com'}. Open Webmail to read and reply.</p>
      {inboxError && <p role="alert" className="mt-3 text-xs text-red-700">{inboxError}</p>}
      {inbox.length > 0 ? <div className="mt-3 divide-y divide-[#E9DFFF]">{inbox.map((item, position) => <div key={`${item.date}-${position}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p className={`text-slate-900 ${item.unread ? 'font-bold' : 'font-medium'}`}>{item.subject || '(No subject)'}</p><p className="text-slate-600">{item.from}</p></div><p className="text-xs text-slate-500">{item.date}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-600">{sender?.connected ? 'Click Refresh inbox to load recent messages.' : 'Connect the mailbox on the backend to see replies here.'}</p>}
    </section>

    <section className="rounded-2xl border border-[#E9DFFF] bg-white p-5 sm:p-6" aria-label="Prospects needing an email address">
      <h2 className="text-lg font-bold text-[#32136B]">Prepare the next prospect</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Every remaining prospect has a proposed email below. Review it one by one, then add a public business email from the company’s official site and the page link. Creating a draft does not send it.</p>
      <form onSubmit={(event) => { event.preventDefault(); loadProspects(search).catch((cause) => toast.error(userFacingError(cause))) }} className="mt-4 flex max-w-xl gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company name" aria-label="Search prospects" className="min-w-0 flex-1 rounded-xl border border-[#D8C8FF] px-3 py-2.5 text-sm" /><button type="submit" className="rounded-xl border border-[#D8C8FF] px-4 text-sm font-semibold text-[#32136B] hover:bg-[#F8F5FF]">Search</button></form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-slate-500">Showing {prospects.length ? prospectOffset + 1 : 0}–{prospectOffset + prospects.length} of {prospectTotal} needing verification</p><div className="flex gap-2"><button type="button" disabled={prospectOffset === 0} onClick={() => loadProspects(search, Math.max(0, prospectOffset - 20)).catch((cause) => toast.error(userFacingError(cause)))} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B] disabled:opacity-40">Previous 20</button><button type="button" disabled={prospectOffset + 20 >= prospectTotal} onClick={() => loadProspects(search, prospectOffset + 20).catch((cause) => toast.error(userFacingError(cause)))} className="rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B] disabled:opacity-40">Next 20</button></div></div>
      <div className="mt-3 max-h-72 divide-y divide-[#E9DFFF] overflow-y-auto rounded-xl border border-[#E9DFFF]">{prospects.map((prospect) => <button key={prospect.lead_id} type="button" onClick={() => selectProspect(prospect)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F8F5FF] ${selected?.lead_id === prospect.lead_id ? 'bg-[#F1EBFF]' : ''}`}><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{prospect.company_name}</strong><span className="block truncate text-xs text-slate-600">{prospect.lead_id} · {prospect.industry}</span></span><span className="shrink-0 text-xs font-semibold text-[#6C3BFF]">Review</span></button>)}</div>
      {selected && <div className="mt-5 rounded-xl bg-[#F8F5FF] p-4">
        {selected.research_email && selected.research_source_url && <div className="mb-4 rounded-lg border border-[#D8C8FF] bg-white p-3 text-sm"><p className="font-semibold text-[#32136B]">Researched contact</p><p className="mt-1 break-all text-slate-700">{selected.research_email}</p><a href={selected.research_source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#5A2BE6] underline">Check the official contact page <ExternalLink className="h-3 w-3" /></a><p className="mt-2 text-xs text-slate-600">Check that this address is still listed and appropriate before using it. A public address does not establish marketing consent.</p><button type="button" onClick={() => { setVerifiedEmail(selected.research_email || ''); setSourceUrl(selected.research_source_url || '') }} className="mt-2 rounded-lg border border-[#D8C8FF] px-3 py-1.5 text-xs font-semibold text-[#32136B]">Use this contact for a review draft</button></div>}
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-[#6C3BFF]">Proposed email · {prospectOffset + prospects.findIndex((item) => item.lead_id === selected.lead_id) + 1} of {prospectTotal}</p><h3 className="mt-1 text-base font-bold text-[#32136B]">{selected.company_name}</h3></div><div className="flex gap-2"><button type="button" aria-label="Previous prospect" disabled={busy || prospectOffset + prospects.findIndex((item) => item.lead_id === selected.lead_id) === 0} onClick={() => { const position = prospects.findIndex((item) => item.lead_id === selected.lead_id); if (position > 0) selectProspect(prospects[position - 1]); else loadProspects(search, prospectOffset - 20, true).catch((cause) => toast.error(userFacingError(cause))) }} className="rounded-lg border border-[#D8C8FF] bg-white p-2 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /></button><button type="button" aria-label="Next prospect" disabled={busy || prospectOffset + prospects.findIndex((item) => item.lead_id === selected.lead_id) + 1 >= prospectTotal} onClick={() => { const position = prospects.findIndex((item) => item.lead_id === selected.lead_id); if (position + 1 < prospects.length) selectProspect(prospects[position + 1]); else loadProspects(search, prospectOffset + 20).catch((cause) => toast.error(userFacingError(cause))) }} className="rounded-lg border border-[#D8C8FF] bg-white p-2 disabled:opacity-40"><ArrowRight className="h-4 w-4" /></button></div></div>
        <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-700">Subject<input value={prospectSubject} maxLength={180} onChange={(event) => setProspectSubject(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#D8C8FF] bg-white px-3 py-2.5 text-sm font-normal" /></label><label className="block text-xs font-semibold text-slate-700">Email body<textarea value={prospectBody} maxLength={12000} onChange={(event) => setProspectBody(event.target.value)} rows={13} className="mt-1 block w-full resize-y rounded-xl border border-[#D8C8FF] bg-white px-3 py-3 text-sm font-normal leading-6" /></label></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Verified business email<input type="email" value={verifiedEmail} onChange={(event) => setVerifiedEmail(event.target.value)} placeholder="team@company.com" className="mt-1 block w-full rounded-xl border border-[#D8C8FF] bg-white px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Official page showing this email<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://company.com/contact" className="mt-1 block w-full rounded-xl border border-[#D8C8FF] bg-white px-3 py-2.5 text-sm font-normal" /></label></div><button type="button" disabled={busy || !verifiedEmail.trim() || !sourceUrl.trim() || !prospectSubject.trim() || !prospectBody.trim()} onClick={prepareDraft} className="mt-3 rounded-xl bg-[#6C3BFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A2BE6] disabled:opacity-40">Create review draft</button>
      </div>}
    </section>
  </div>
}
