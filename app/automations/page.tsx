'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Clock3, Plus, RefreshCw, Trash2, Workflow, XCircle, Zap } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, MetricGrid, StatusBadge, Toolbar, downloadCsv } from '@/components/PlatformUI'

const triggers = ['WhatsApp message', 'Customer reply', 'Voice call', 'Missed call', 'New lead', 'Lead qualified']
const actions = ['Create lead', 'Update lead', 'Send WhatsApp', 'Human handoff']
const leadStatuses = ['new', 'contacted', 'qualified', 'hot', 'converted', 'lost']

type Step = { type: string; message?: string }
type Condition = { field: string; operator: string; value: string }
type Automation = { _id: string; name: string; description?: string; trigger: string; steps?: Step[]; enabled: boolean; runs?: number; errors?: number; last_run_at?: string; last_run_status?: string; last_run_error?: string; last_run?: { automation_name?: string; event?: string; status?: string; created_at?: string; error?: string } | null }

const emptyForm = { name: '', description: '', trigger: 'WhatsApp message', conditions: [] as Condition[], steps: [{ type: 'Create lead' }] as Step[] }
const conditionFields = ['status', 'source', 'direction', 'channel']
const conditionOperators = ['equals', 'contains', 'not equals', 'exists']

export default function AutomationsPage() {
  const [rows, setRows] = useState<Automation[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [automationResult, runResult] = await Promise.all([api<any>('/api/platform/automations'), api<any>('/api/platform/automations/runs?limit=20')])
      setRows(automationResult.data || [])
      setRuns(runResult.data || [])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Unable to load automations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) return toast.error('Add a workflow name')
    setSaving(true)
    try {
      await api('/api/platform/automations', { method: 'POST', body: JSON.stringify({ ...form, name: form.name.trim(), description: form.description.trim(), enabled: true }) })
      toast.success('Automation enabled')
      setForm(emptyForm)
      setShowCreate(false)
      await load()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to save automation')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (row: Automation) => {
    try {
      await api(`/api/platform/automations/${row._id}`, { method: 'PUT', body: JSON.stringify({ enabled: !row.enabled }) })
      toast.success(row.enabled ? 'Automation paused' : 'Automation enabled')
      await load()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : 'Unable to update automation')
    }
  }

  const addStep = () => setForm((current) => ({ ...current, steps: [...current.steps, { type: 'Update lead' }] }))
  const removeStep = (index: number) => setForm((current) => ({ ...current, steps: current.steps.filter((_, stepIndex) => stepIndex !== index) }))
  const updateStep = (index: number, value: string) => setForm((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, type: value, message: value === 'Send WhatsApp' ? step.message : undefined, status: value === 'Update lead' ? (step as Step & { status?: string }).status || 'contacted' : undefined } : step) }))
  const addCondition = () => setForm((current) => ({ ...current, conditions: [...current.conditions, { field: 'status', operator: 'equals', value: '' }] }))
  const removeCondition = (index: number) => setForm((current) => ({ ...current, conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index) }))
  const updateCondition = (index: number, key: keyof Condition, value: string) => setForm((current) => ({ ...current, conditions: current.conditions.map((condition, conditionIndex) => conditionIndex === index ? { ...condition, [key]: value } : condition) }))

  const enabled = rows.filter((row) => row.enabled).length
  const totalRuns = rows.reduce((sum, row) => sum + (row.runs || 0), 0)
  const failures = rows.reduce((sum, row) => sum + (row.errors || 0), 0)
  const workflowRuns = useMemo(() => rows.map((row) => row.last_run).filter(Boolean).sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()), [rows])
  const lastRun = workflowRuns[0]
  const visibleRuns = useMemo(() => { const workflowIds = new Set(rows.map((row) => String(row._id))); return runs.filter((run) => workflowIds.has(String(run.automation_id))) }, [rows, runs])

  return <div className="space-y-7">
    <PageHeader title="Automations" description="Run useful follow-up actions when a WhatsApp message, call, lead, or handoff event arrives. Every run is recorded here." actionLabel="AI Activity" actionHref="/brain/activity" />
    <Toolbar onRefresh={load} onExport={() => downloadCsv('automations')}>
      <span className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500"><Zap className="h-4 w-4 text-[#d97706]" />Live event workflows</span>
    </Toolbar>
    <DataState loading={loading} error={error} onRetry={load}>
      <MetricGrid items={[{ label: 'Active workflows', value: enabled, detail: `${rows.length} configured` }, { label: 'Events processed', value: totalRuns, detail: 'Successful and failed runs' }, { label: 'Errors', value: failures, detail: failures ? 'Review failed runs' : 'No failures recorded' }, { label: 'Last workflow run', value: lastRun ? (lastRun.status || 'unknown') : '—', detail: lastRun ? `${lastRun.automation_name || 'Workflow'} · ${new Date(lastRun.created_at || '').toLocaleString()}` : 'No workflow runs yet' }]} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <section className="surface-panel rounded-[24px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-base font-bold text-slate-900"><Workflow className="h-5 w-5 text-[#5a67b1]" />Event workflows</div><p className="mt-1 text-sm text-slate-500">Only supported events and actions can be configured.</p></div>
            <ActionButton primary onClick={() => setShowCreate((current) => !current)} icon={<Plus className="h-4 w-4" />}>{showCreate ? 'Close' : 'New automation'}</ActionButton>
          </div>

          {showCreate && <div className="mt-5 rounded-2xl border border-[#d9def7] bg-[#f8f9ff] p-5">
            <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Workflow name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Missed call follow-up" className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm" /></label><label className="text-xs font-semibold text-slate-600">Runs when<select value={form.trigger} onChange={(event) => setForm({ ...form, trigger: event.target.value })} className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm">{triggers.map((trigger) => <option key={trigger}>{trigger}</option>)}</select></label></div>
            <label className="mt-4 block text-xs font-semibold text-slate-600">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain what this workflow does" className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm" /></label>
            <div className="mt-5"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-600">Conditions</div><div className="mt-1 text-[11px] font-normal text-slate-500">Optional: every condition must match before actions run.</div></div><button type="button" onClick={addCondition} className="text-xs font-semibold text-[#5a67b1]">+ Add condition</button></div>{form.conditions.length > 0 && <div className="mt-2 space-y-2">{form.conditions.map((condition, index) => <div key={index} className="flex flex-wrap items-center gap-2"><select value={condition.field} onChange={(event) => updateCondition(index, 'field', event.target.value)} className="h-10 rounded-lg border-slate-200 bg-white text-sm">{conditionFields.map((field) => <option key={field}>{field}</option>)}</select><select value={condition.operator} onChange={(event) => updateCondition(index, 'operator', event.target.value)} className="h-10 rounded-lg border-slate-200 bg-white text-sm">{conditionOperators.map((operator) => <option key={operator}>{operator}</option>)}</select>{condition.operator !== 'exists' && <input value={condition.value} onChange={(event) => updateCondition(index, 'value', event.target.value)} placeholder="Value" className="h-10 min-w-[180px] flex-1 rounded-lg border-slate-200 bg-white text-sm" />}<button type="button" onClick={() => removeCondition(index)} aria-label="Remove condition" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>
            <div className="mt-5"><div className="flex items-center justify-between"><div className="text-xs font-semibold text-slate-600">Actions</div><button type="button" onClick={addStep} className="text-xs font-semibold text-[#5a67b1]">+ Add action</button></div><div className="mt-2 space-y-2">{form.steps.map((step, index) => <div key={index} className="flex flex-wrap items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500">{index + 1}</span><select value={step.type} onChange={(event) => updateStep(index, event.target.value)} className="h-10 min-w-[220px] flex-1 rounded-lg border-slate-200 bg-white text-sm">{actions.map((action) => <option key={action}>{action}</option>)}</select>{step.type === 'Update lead' && <select value={(step as Step & { status?: string }).status || 'contacted'} onChange={(event) => setForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, status: event.target.value } : item) }))} className="h-10 rounded-lg border-slate-200 bg-white text-sm">{leadStatuses.map((status) => <option key={status}>{status}</option>)}</select>}{step.type === 'Send WhatsApp' && <input value={step.message || ''} onChange={(event) => setForm((current) => ({ ...current, steps: current.steps.map((item, stepIndex) => stepIndex === index ? { ...item, message: event.target.value } : item) }))} placeholder="Message to send" className="h-10 min-w-[220px] flex-[2] rounded-lg border-slate-200 bg-white text-sm" />}{form.steps.length > 1 && <button type="button" onClick={() => removeStep(index)} aria-label="Remove action" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}</div>)}</div></div>
            <div className="mt-5 flex justify-end gap-2"><ActionButton onClick={() => setShowCreate(false)}>Cancel</ActionButton><ActionButton primary onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create automation'}</ActionButton></div>
          </div>}

          <div className="mt-5 space-y-3">{rows.length ? rows.map((row) => <div key={row._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-900">{row.name}</div><div className="mt-1 text-xs text-slate-500">When <span className="font-semibold text-slate-700">{row.trigger}</span> · then {row.steps?.map((step) => step.type).join(' → ') || 'No actions configured'}</div></div><div className="flex items-center gap-2"><StatusBadge value={row.enabled ? 'Enabled' : 'Paused'} /><ActionButton onClick={() => toggle(row)}>{row.enabled ? 'Pause' : 'Enable'}</ActionButton></div></div><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500"><span>{row.runs || 0} runs</span><span>{row.errors || 0} errors</span>{row.last_run_at && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(row.last_run_at).toLocaleString()}</span>}{row.last_run_status === 'error' && <span className="text-rose-600">{row.last_run_error}</span>}</div></div>) : <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center"><Workflow className="mx-auto h-7 w-7 text-slate-300" /><div className="mt-3 text-sm font-semibold text-slate-800">No automations configured</div><div className="mt-1 text-xs text-slate-500">Create one to respond to real workspace events.</div></div>}</div>
        </section>

        <section className="surface-panel rounded-[24px] p-6"><div className="flex items-center gap-2 text-base font-bold text-slate-900"><RefreshCw className="h-5 w-5 text-[#16805c]" />Recent workflow runs</div><p className="mt-1 text-sm text-slate-500">Only runs belonging to the workflows configured above.</p><div className="mt-5 space-y-3">{visibleRuns.length ? visibleRuns.map((run) => <div key={run._id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-800">{run.automation_name}</span>{run.status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16805c]" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}</div><div className="mt-1 text-[11px] text-slate-500">{run.event} · {new Date(run.created_at).toLocaleString()}</div>{run.error && <div className="mt-2 text-[11px] text-rose-600">{run.error}</div>}</div>) : <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">No workflow event has been processed yet.</div>}</div></section>
      </div>
    </DataState>
  </div>
}
