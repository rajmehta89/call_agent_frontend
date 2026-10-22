'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Mic, PhoneOff, PhoneCall, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, StatusBadge } from '@/components/PlatformUI'

type CallState = 'idle' | 'connecting' | 'connected' | 'error'

export default function BrowserVoiceTestPage() {
  const deviceRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const [state, setState] = useState<CallState>('idle')
  const [message, setMessage] = useState('Ready to start a browser-only test call.')

  const endCall = () => {
    callRef.current?.disconnect()
    deviceRef.current?.destroy()
    callRef.current = null
    deviceRef.current = null
    setState('idle')
    setMessage('Call ended. It appears in Call history within a few seconds.')
  }

  const startCall = async () => {
    if (state === 'connecting' || state === 'connected') return
    setState('connecting')
    setMessage('Preparing your microphone and connecting securely to Twilio...')

    try {
      const fetchToken = async () => (await api<{ success: boolean; data: { token: string } }>('/api/twilio/browser-token')).data.token
      const { Device } = await import('@twilio/voice-sdk')
      // Ask for a fresh token a minute before expiry so long test calls are not cut off.
      const device = new Device(await fetchToken(), { logLevel: 1, tokenRefreshMs: 60000 })
      deviceRef.current = device

      device.on('tokenWillExpire', async () => {
        try { device.updateToken(await fetchToken()) } catch { /* the error handler reports a real expiry */ }
      })
      device.on('error', (error: Error) => {
        setState('error')
        setMessage(error.message || 'The browser call could not connect.')
      })
      device.on('disconnect', () => {
        callRef.current = null
        setState('idle')
        setMessage('Call ended. It appears in Call history within a few seconds.')
      })

      await device.register()
      const call = await device.connect({ params: { source: 'browser_test' } })
      callRef.current = call
      setState('connected')
      setMessage('Connected. You should now hear the AI greeting through your speakers.')
    } catch (error) {
      deviceRef.current?.destroy()
      deviceRef.current = null
      setState('error')
      setMessage(error instanceof Error ? error.message : 'The browser call could not start.')
    }
  }

  useEffect(() => () => { deviceRef.current?.destroy() }, [])

  const active = state === 'connecting' || state === 'connected'
  return <div className="space-y-6">
    <PageHeader title="Browser voice test" description="Talk to the inbound AI agent using this browser, without calling your business number from a phone." />
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
    <section className="surface-panel rounded-[24px] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1EBFF] text-[#5A2BE6]"><Headphones className="h-6 w-6" /></span><div><h2 className="text-lg font-bold text-slate-900">Microphone test call</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Chrome will ask for microphone permission. It is answered by whichever voice provider is on (Voice providers), with the same AI, knowledge and call history as phone calls.</p></div></div>
        <StatusBadge value={state === 'connected' ? 'Connected' : state === 'connecting' ? 'Connecting' : state === 'error' ? 'Failed' : 'Ready'} />
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Mic className="h-4 w-4 text-[#5A2BE6]" />Call status</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionButton primary disabled={active} onClick={startCall} icon={<PhoneCall className="h-4 w-4" />}>{state === 'connecting' ? 'Connecting…' : 'Start browser test'}</ActionButton>
        <ActionButton disabled={!active} onClick={endCall} tone="danger" icon={<PhoneOff className="h-4 w-4" />}>End call</ActionButton>
      </div>
    </section>

    <section className="surface-panel rounded-[24px] p-6"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-[#5A2BE6]" />What this test does</div><p className="mt-2 text-sm leading-6 text-slate-500">It uses a short-lived browser token issued only after you sign in. Your Twilio secret stays on the backend. When finished, open Call history to review the saved conversation.</p></section>
    </div>
  </div>
}
