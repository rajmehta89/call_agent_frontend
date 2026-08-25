'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardList, PhoneForwarded, RefreshCcw, Sparkles, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/OmniPage'

const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'http://localhost:8000'

interface HandoffMessage {
  speaker: string
  content: string
  timestamp: string
}

interface Handoff {
  session_id: string
  phone_number: string
  status: 'awaiting_human' | 'accepted'
  transfer_reason?: string
  transfer_mode?: string
  transfer_confidence?: number
  accepted_by?: string
  updated_at: string
  messages: HandoffMessage[]
}

export default function HandoffsPage() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)

  const loadHandoffs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/handoffs`, { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        setHandoffs(data.data)
      }
    } catch (error) {
      console.error('Failed to load handoffs', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHandoffs()
    const timer = setInterval(loadHandoffs, 4000)
    return () => clearInterval(timer)
  }, [])

  const acceptHandoff = async (sessionId: string) => {
    const response = await fetch(`${API_BASE}/api/handoffs/${sessionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name: 'Human Agent' }),
    })

    if (!response.ok) {
      toast.error('Could not accept handoff')
      return
    }

    toast.success('Handoff accepted')
    loadHandoffs()
  }

  const resolveHandoff = async (sessionId: string) => {
    const response = await fetch(`${API_BASE}/api/handoffs/${sessionId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Handled by human agent' }),
    })

    if (!response.ok) {
      toast.error('Could not resolve handoff')
      return
    }

    toast.success('Handoff resolved')
    loadHandoffs()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Human Handoffs"
        description="A premium live desk for escalated callers. Every transfer surfaces the reason, confidence, and latest context so a human can take over cleanly."
        actionLabel="Refresh Queue"
        actionHref="/handoffs"
      />

      <div className="flex justify-end">
        <button
          onClick={loadHandoffs}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh live queue
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={PhoneForwarded} label="Awaiting human" value={handoffs.filter((item) => item.status === 'awaiting_human').length} tone="amber" />
        <MetricCard icon={UserRound} label="Accepted" value={handoffs.filter((item) => item.status === 'accepted').length} tone="teal" />
        <MetricCard icon={ClipboardList} label="Open queue" value={handoffs.length} tone="slate" />
      </div>

      {loading ? (
        <div className="surface-panel rounded-[28px] p-6 text-slate-400">Loading handoffs...</div>
      ) : handoffs.length === 0 ? (
        <div className="surface-panel rounded-[28px] p-8 text-slate-400">No active handoffs right now.</div>
      ) : (
        <div className="space-y-5">
          {handoffs.map((handoff) => (
            <div key={handoff.session_id} className="surface-panel-strong rounded-[30px] p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="premium-badge pending">{handoff.phone_number}</span>
                    <span className={`premium-badge ${handoff.status === 'accepted' ? 'live' : 'pending'}`}>
                      {handoff.status === 'accepted' ? 'Accepted' : 'Awaiting takeover'}
                    </span>
                    <span className="premium-badge pending">
                      {handoff.transfer_mode === 'explicit' ? 'Explicit customer request' : 'Intent escalation'}
                    </span>
                  </div>
                  <div className="max-w-3xl text-base leading-7 text-white">
                    {handoff.transfer_reason || 'Human handoff requested.'}
                  </div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Confidence {Math.round((handoff.transfer_confidence || 0) * 100)}% · Updated {new Date(handoff.updated_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {handoff.status === 'awaiting_human' && (
                    <button
                      onClick={() => acceptHandoff(handoff.session_id)}
                      className="rounded-md bg-[#d97706] px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_8px_16px_rgba(217,119,6,.16)] transition hover:brightness-105"
                    >
                      Accept handoff
                    </button>
                  )}
                  <button
                    onClick={() => resolveHandoff(handoff.session_id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#d6a34f]/30 bg-[#d6a34f]/12 px-4 py-3 text-sm font-semibold text-[#f4d39a] transition hover:bg-[#d6a34f]/18"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-[#f4d39a]" />
                  Latest session context
                </div>
                {handoff.messages?.length ? (
                  <div className="space-y-3">
                    {handoff.messages.slice(-6).map((message, index) => (
                      <div key={`${handoff.session_id}-${index}`} className="rounded-[20px] border border-white/6 bg-black/20 px-4 py-3">
                        <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-500">{message.speaker}</div>
                        <div className="text-sm leading-7 text-slate-200">{message.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No transcript context yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof PhoneForwarded
  label: string
  value: number
  tone: 'amber' | 'teal' | 'slate'
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-[#f4d39a] bg-[#d6a34f]/10'
      : tone === 'teal'
        ? 'text-[#b45309] bg-[#fff7ed]'
        : 'text-white bg-white/[0.06]'

  return (
    <div className="surface-panel rounded-[28px] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="text-3xl font-extrabold tracking-[-0.05em] text-white">{value}</div>
        </div>
      </div>
    </div>
  )
}
