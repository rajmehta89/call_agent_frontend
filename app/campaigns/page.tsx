'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Clock3, FileText, Mail, Plus, Save, Send, ShieldCheck, UserX } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge, Toolbar } from '@/components/PlatformUI'

type Policy = { approval_required: boolean; timezone: string; approval_start_hour: number; approval_end_hour: number; send_start_hour: number; send_end_hour: number; approval_start_time: string; approval_end_time: string; send_start_time: string; send_end_time: string; send_days: number[]; approval_window_open?: boolean; send_window_open?: boolean }
type Draft = { _id: string; company_name: string; recipient_email: string; website?: string; company_context?: string; campaign_name?: string; subject: string; body: string; status: string; created_at: string; source?: string; template_name?: string }
type EmailTemplate = { id: string; name: string; description?: string; subject: string; body: string; built_in?: boolean; active?: boolean }

const defaultPolicy: Policy = { approval_required: true, timezone: 'Asia/Kolkata', approval_start_hour: 9, approval_end_hour: 18, approval_start_time: '09:00', approval_end_time: '18:00', send_start_hour: 9, send_end_hour: 18, send_start_time: '09:00', send_end_time: '18:00', send_days: [0, 1, 2, 3, 4] }
const emptyForm = { company_name: '', recipient_email: '', website: '', context: '', template_id: '' }
const emptyTemplate = { name: '', description: '', subject: '', body: '' }
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CampaignsPage() {
  const [policy, setPolicy] = useState<Policy>(defaultPolicy)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [gmail, setGmail] = useState<any>({})
  const [form, setForm] = useState(emptyForm)
  const [templateForm, setTemplateForm] = useState(emptyTemplate)
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [policyResult, draftsResult, gmailResult, templatesResult] = await Promise.all([api<any>('/api/platform/email-policy'), api<any>('/api/platform/email-outbox'), api<any>('/api/platform/gmail/status'), api<any>('/api/platform/email-templates')])
      setPolicy(policyResult.data || defaultPolicy)
      setDrafts(draftsResult.data || [])
      setGmail(gmailResult.data || {})
      setTemplates(templatesResult.data || [])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Unable to load campaign workspace')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const savePolicy = async (next: Policy) => {
    try {
      const result = await api<any>('/api/platform/email-policy', { method: 'PUT', body: JSON.stringify({ value: next }) })
      setPolicy(result.data)
      toast.success(next.approval_required ? 'Approval is required before sending' : 'Approval disabled; send window still applies')
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to save email policy')
    }
  }

  const createDraft = async () => {
    if (!form.company_name.trim() || !form.recipient_email.trim()) return toast.error('Add the company and recipient email')
    setSaving(true)
    try {
      await api('/api/platform/email-outbox', { method: 'POST', body: JSON.stringify({ ...form, campaign_name: 'USA AI automation outreach' }) })
      setForm(emptyForm)
      setShowCreate(false)
      toast.success('Personalized draft added to approval queue')
      await load()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to create draft')
    } finally {
      setSaving(false)
    }
  }

  const createTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) return toast.error('Add a template name, subject, and body')
    setSavingTemplate(true)
    try {
      const result = await api<any>('/api/platform/email-templates', { method: 'POST', body: JSON.stringify(templateForm) })
      setTemplates((current) => [...current, result.data])
      setTemplateForm(emptyTemplate)
      setShowTemplateForm(false)
      toast.success('Email template saved')
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to save email template')
    } finally {
      setSavingTemplate(false)
    }
  }

  const decide = async (draft: Draft, decision: 'approve' | 'exclude') => {
    try {
      await api(`/api/platform/email-outbox/${draft._id}/decision`, { method: 'PUT', body: JSON.stringify({ value: { decision } }) })
      toast.success(decision === 'approve' ? 'Email sent' : 'Company excluded; it will never be mailed')
      await load()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to update draft')
    }
  }

  const notifyOwner = async () => {
    setNotifying(true)
    try {
      const result = await api<any>('/api/platform/email-outbox/notify', { method: 'POST', body: JSON.stringify({ value: {} }) })
      toast.success(result.data?.message || `Review digest sent to ${gmail.address || 'your Gmail'}`)
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to send review digest')
    } finally {
      setNotifying(false)
    }
  }

  const pending = useMemo(() => drafts.filter((draft) => draft.status === 'pending_approval'), [drafts])
  const sent = drafts.filter((draft) => draft.status === 'sent').length
  const excluded = drafts.filter((draft) => draft.status === 'excluded').length

  return <div className="space-y-7">
    <PageHeader title="Campaigns" description="Review USA business prospects, choose a proven template, and control exactly when Gmail can send." actionLabel="AI Tools" actionHref="/brain/tools" />
    <Toolbar onRefresh={load}><span className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4 text-[#16805c]" />Review-first outreach</span></Toolbar>
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[{ label: 'Awaiting approval', value: pending.length, detail: 'Can be approved or excluded' }, { label: 'Sent', value: sent, detail: 'Delivered through Gmail' }, { label: 'Excluded', value: excluded, detail: 'Never sent' }, { label: 'Gmail', value: gmail.connected ? 'Connected' : 'Setup needed', detail: gmail.address || 'No sender configured' }]} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="surface-panel rounded-[24px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-base font-bold text-slate-900"><Mail className="h-5 w-5 text-[#d97706]" />Prospect email queue</div><p className="mt-1 text-sm text-slate-500">Exclude any company you do not want to contact. Excluded drafts are permanently blocked from sending.</p></div><div className="flex flex-wrap gap-2"><ActionButton onClick={notifyOwner} disabled={notifying || !pending.length || !gmail.connected} icon={<Send className="h-4 w-4" />}>{notifying ? 'Sending review...' : 'Email me review'}</ActionButton><ActionButton primary onClick={() => setShowCreate((current) => !current)} icon={<Plus className="h-4 w-4" />}>{showCreate ? 'Close' : 'Add prospect'}</ActionButton></div></div>
          <div className="mt-4 rounded-xl border border-[#d9def7] bg-[#f8f9ff] px-4 py-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Review flow:</span> click <span className="font-semibold">Email me review</span> to receive the prepared prospects at {gmail.address || 'your Gmail'}, then use this page to approve and send only the good ones or exclude the rest. The review email never contacts prospects.</div>
          {showCreate && <div className="mt-5 rounded-2xl border border-[#d9def7] bg-[#f8f9ff] p-5"><div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Company name<input value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} placeholder="Example: Acme Home Services" className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm" /></label><label className="text-xs font-semibold text-slate-600">Recipient email<input value={form.recipient_email} onChange={(event) => setForm({ ...form, recipient_email: event.target.value })} placeholder="owner@example.com" className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm" /></label></div><label className="mt-4 block text-xs font-semibold text-slate-600">Email template<select value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })} className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"><option value="">Automatic — use best Raj template</option>{templates.filter((template) => template.active !== false).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><span className="mt-1 block font-normal text-slate-400">Leave this automatic to let the campaign choose Raj’s default template and personalize it.</span></label><label className="mt-4 block text-xs font-semibold text-slate-600">Website or source URL<input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://example.com" className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm" /></label><label className="mt-4 block text-xs font-semibold text-slate-600">Company context<textarea value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} placeholder="What they do, likely problem, or why Raj can help" className="mt-2 min-h-24 w-full rounded-lg border-slate-200 bg-white text-sm" /></label><div className="mt-4 flex justify-end"><ActionButton primary onClick={createDraft} disabled={saving}>{saving ? 'Creating...' : 'Create personalized draft'}</ActionButton></div></div>}
          <div className="mt-5 space-y-3">{drafts.length ? drafts.map((draft) => <div key={draft._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><div className="truncate text-sm font-bold text-slate-900">{draft.company_name}</div><StatusBadge value={draft.status === 'pending_approval' ? 'Needs approval' : draft.status} /></div><div className="mt-1 text-xs text-slate-500">{draft.recipient_email}{draft.website ? ` · ${draft.website}` : ''}{draft.template_name ? ` · ${draft.template_name}` : ''}</div></div>{draft.status === 'pending_approval' && <div className="flex shrink-0 gap-2"><ActionButton primary onClick={() => decide(draft, 'approve')} icon={<Check className="h-3.5 w-3.5" />}>Approve & send</ActionButton><ActionButton onClick={() => decide(draft, 'exclude')} icon={<UserX className="h-3.5 w-3.5" />}>Exclude</ActionButton></div>}</div><div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-800">{draft.subject}</div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{draft.body}</p></div></div>) : <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center"><Mail className="mx-auto h-7 w-7 text-slate-300" /><div className="mt-3 text-sm font-semibold text-slate-800">No prospect drafts yet</div><div className="mt-1 text-xs text-slate-500">Add your first USA business prospect or connect a discovery source.</div></div>}</div>
        </section>
        <section className="surface-panel rounded-[24px] p-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900"><Clock3 className="h-5 w-5 text-[#5a67b1]" />IST approval controls</div>
          <p className="mt-1 text-sm leading-6 text-slate-500">Set different approval and sending times in IST. At night, drafts stay queued until the next allowed window.</p>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"><div><div className="text-sm font-semibold text-slate-800">Require approval</div><div className="mt-1 text-xs text-slate-500">{policy.approval_required ? 'Every email waits for your approval.' : 'Emails can auto-send during the send window.'}</div></div><button type="button" onClick={() => savePolicy({ ...policy, approval_required: !policy.approval_required })} className={`h-7 w-12 rounded-full p-1 transition ${policy.approval_required ? 'bg-[#d97706]' : 'bg-slate-300'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${policy.approval_required ? 'translate-x-5' : ''}`} /></button></div>
          <div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current status</div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-400">Approval window</div><div className="mt-1 text-sm font-bold text-slate-800">{policy.approval_start_time}–{policy.approval_end_time} IST</div><div className="mt-1 text-xs text-slate-500">{policy.approval_window_open ? 'Open now' : 'Closed now'}</div></div><div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-400">Send window</div><div className="mt-1 text-sm font-bold text-slate-800">{policy.send_start_time}–{policy.send_end_time} IST</div><div className="mt-1 text-xs text-slate-500">{policy.send_window_open ? 'Open now' : 'Closed now'}</div></div></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Approval starts<input type="time" value={policy.approval_start_time} onChange={(event) => setPolicy({ ...policy, approval_start_time: event.target.value })} onBlur={() => savePolicy(policy)} className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Approval ends<input type="time" value={policy.approval_end_time} onChange={(event) => setPolicy({ ...policy, approval_end_time: event.target.value })} onBlur={() => savePolicy(policy)} className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Send starts<input type="time" value={policy.send_start_time} onChange={(event) => setPolicy({ ...policy, send_start_time: event.target.value })} onBlur={() => savePolicy(policy)} className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Send ends<input type="time" value={policy.send_end_time} onChange={(event) => setPolicy({ ...policy, send_end_time: event.target.value })} onBlur={() => savePolicy(policy)} className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm" /></label></div>
          <div className="mt-5 text-xs font-semibold text-slate-600">Allowed days<div className="mt-2 flex flex-wrap gap-2">{days.map((day, index) => <button type="button" key={day} onClick={() => { const next = policy.send_days.includes(index) ? policy.send_days.filter((item) => item !== index) : [...policy.send_days, index].sort(); const updated = { ...policy, send_days: next }; setPolicy(updated); savePolicy(updated) }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${policy.send_days.includes(index) ? 'bg-[#d97706] text-white' : 'bg-slate-100 text-slate-400'}`}>{day}</button>)}</div></div>
          <div className="mt-6 border-t border-slate-100 pt-6"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-base font-bold text-slate-900"><FileText className="h-4 w-4 text-[#d97706]" />Email templates</div><p className="mt-1 text-xs text-slate-500">Choose a template for each draft, then review the personalized subject and body before sending.</p></div><ActionButton onClick={() => setShowTemplateForm((current) => !current)} icon={<Plus className="h-4 w-4" />}>{showTemplateForm ? 'Close' : 'New template'}</ActionButton></div>{showTemplateForm && <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} placeholder="Template name" className="h-10 w-full rounded-lg border-slate-200 text-sm" /><input value={templateForm.subject} onChange={(event) => setTemplateForm({ ...templateForm, subject: event.target.value })} placeholder="Subject, e.g. A practical idea for {{company_name}}" className="h-10 w-full rounded-lg border-slate-200 text-sm" /><textarea value={templateForm.body} onChange={(event) => setTemplateForm({ ...templateForm, body: event.target.value })} placeholder="Body. Use {{company_name}}, {{company_context}}, and {{website}}." className="min-h-28 w-full rounded-lg border-slate-200 text-sm" /><ActionButton primary onClick={createTemplate} disabled={savingTemplate} icon={<Save className="h-4 w-4" />}>{savingTemplate ? 'Saving...' : 'Save template'}</ActionButton></div>}<div className="mt-4 space-y-2">{templates.map((template) => <div key={template.id} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-800">{template.name}</div><div className="mt-1 text-[11px] text-slate-500">{template.description}</div></div>)}</div></div>
        </section>
      </div>
    </DataState>
  </div>
}
