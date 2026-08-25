'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardList, PhoneForwarded, RefreshCcw, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'

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
      body: JSON.stringify({ agent_name: 'Human Agent' })
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
      body: JSON.stringify({ notes: 'Handled by human agent' })
    })

    if (!response.ok) {
      toast.error('Could not resolve handoff')
      return
    }

    toast.success('Handoff resolved')
    loadHandoffs()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Human Handoffs</h1>
          <p className="mt-1 text-slate-400">Calls land here when the customer asks for a human or the AI flags escalation.</p>
        </div>
        <button
          onClick={loadHandoffs}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <PhoneForwarded className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm text-slate-400">Waiting</div>
              <div className="text-2xl font-bold text-white">{handoffs.filter((item) => item.status === 'awaiting_human').length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-blue-400" />
            <div>
              <div className="text-sm text-slate-400">Accepted</div>
              <div className="text-2xl font-bold text-white">{handoffs.filter((item) => item.status === 'accepted').length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-sm text-slate-400">Open Queue</div>
              <div className="text-2xl font-bold text-white">{handoffs.length}</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading handoffs...</div>
      ) : handoffs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">No active handoffs right now.</div>
      ) : (
        <div className="space-y-4">
          {handoffs.map((handoff) => (
            <div key={handoff.session_id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">{handoff.phone_number}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {handoff.transfer_mode === 'explicit' ? 'Explicit request' : 'Intent analyzer'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{handoff.transfer_reason || 'Human handoff requested.'}</p>
                  <p className="text-xs text-slate-500">
                    Confidence {Math.round((handoff.transfer_confidence || 0) * 100)}% • Updated {new Date(handoff.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {handoff.status === 'awaiting_human' && (
                    <button
                      onClick={() => acceptHandoff(handoff.session_id)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      Accept
                    </button>
                  )}
                  <button
                    onClick={() => resolveHandoff(handoff.session_id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-600/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 rounded-2xl bg-slate-950/80 p-4">
                <div className="text-sm font-medium text-white">Latest context</div>
                {handoff.messages?.length ? (
                  handoff.messages.slice(-6).map((message, index) => (
                    <div key={`${handoff.session_id}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">{message.speaker}</div>
                      <div className="text-sm text-slate-200">{message.content}</div>
                    </div>
                  ))
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
