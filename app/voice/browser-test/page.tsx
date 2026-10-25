'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Mail, Mic, Phone, PhoneCall, PhoneOff, ShieldCheck, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, StatusBadge } from '@/components/PlatformUI'
import { LEAD_LANGUAGES, type LeadLanguage } from '@/components/lead-language'

type CallState = 'idle' | 'connecting' | 'connected' | 'error'

export default function BrowserVoiceTestPage() {
  const deviceRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const [state, setState] = useState<CallState>('idle')
  const [message, setMessage] = useState('Ready to start a browser-only test call.')
  const [callerName, setCallerName] = useState('Raj Mehta')
  const [callerEmail, setCallerEmail] = useState('rajm267747@gmail.com')
  const [callerPhone, setCallerPhone] = useState('+918866631491')
  const [callerLanguage, setCallerLanguage] = useState<LeadLanguage>('en')

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
    const name = callerName.trim()
    const email = callerEmail.trim()
    const phone = callerPhone.trim()
    if (!name || !phone) {
      setState('error')
      setMessage('Add the caller name and mobile number before starting the test.')
      return
    }
    setState('connecting')
    setMessage('Saving caller details and connecting securely to Twilio...')

    try {
      const details = new URLSearchParams({ caller_name: name, caller_email: email, caller_phone: phone, caller_language: callerLanguage })
      const fetchToken = async () => (await api<{ success: boolean; data: { token: string } }>(`/api/twilio/browser-token?${details.toString()}`)).data.token
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
      const call = await device.connect({ params: { source: 'browser_test', caller_name: name, caller_email: email, caller_phone: phone, caller_language: callerLanguage } })
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
    <PageHeader title="Browser voice test" description="Start a browser call and save the caller details to the matching Inbox contact." />
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

      <div className="mt-6 rounded-2xl border border-[#E9DFFF] bg-[#FCFAFF] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><UserRound className="h-4 w-4 text-[#5A2BE6]" />Caller details</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">Add the caller’s details before starting. They are saved to the Inbox contact and used for SMS follow-up.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Caller name</span><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={callerName} onChange={(event) => setCallerName(event.target.value)} disabled={active} placeholder="e.g. Raj Mehta" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6C3BFF] disabled:bg-slate-100" /></div></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Email address <span className="font-normal text-slate-400">(optional)</span></span><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" value={callerEmail} onChange={(event) => setCallerEmail(event.target.value)} disabled={active} placeholder="e.g. name@example.com" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6C3BFF] disabled:bg-slate-100" /></div></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Mobile number</span><div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="tel" value={callerPhone} onChange={(event) => setCallerPhone(event.target.value)} disabled={active} placeholder="e.g. +91 88666 31491" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6C3BFF] disabled:bg-slate-100" /></div><span className="mt-1 block text-[11px] text-slate-400">This number receives SMS replies and follow-up messages.</span></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Call language</span><select value={callerLanguage} onChange={(event) => setCallerLanguage(event.target.value as LeadLanguage)} disabled={active} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#6C3BFF] disabled:bg-slate-100">{LEAD_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label} · {language.nativeLabel}</option>)}</select><span className="mt-1 block text-[11px] text-slate-400">Saved to this lead and used by the AI voice session.</span></label>
        </div>
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
