'use client'

import { useEffect, useState } from 'react'
import { authFetch } from './PlatformUI'

type Props = {
  callId: string
  source?: string
  recordingSid?: string
  part?: 'full' | 'human'
  autoPlay?: boolean
  showDownload?: boolean
}

export function RecordingAudio({ callId, source, recordingSid, part = 'full', autoPlay = false, showDownload = false }: Props) {
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const twilioRecording = Boolean(recordingSid || (source && /(?:api\.twilio\.com|\.twilio\.com)\/.*\/Recordings\/RE/i.test(source)))

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setAudioUrl('')
    setError('')
    if (!source && !recordingSid) return
    if (!twilioRecording) {
      setAudioUrl(source || '')
      return
    }
    setLoading(true)
    authFetch(`/api/calls/${encodeURIComponent(callId)}/recording?part=${part}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('The recording could not be loaded. Please try again.')
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (cancelled) URL.revokeObjectURL(objectUrl)
        else setAudioUrl(objectUrl)
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'The recording could not be loaded.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [callId, part, recordingSid, source, twilioRecording])

  if (loading) return <p className="mt-3 text-sm text-slate-500">Loading recording...</p>
  if (error) return <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
  if (!audioUrl) return <p className="mt-3 text-sm text-slate-500">No recording is available for this call.</p>
  return <>
    <audio className="mt-3 w-full" controls autoPlay={autoPlay} preload="metadata" src={audioUrl}>Your browser does not support audio playback.</audio>
    {showDownload && <a href={audioUrl} download={`call-${callId}.mp3`} className="mt-3 inline-flex text-sm font-medium text-[#6C3BFF] hover:underline">Download recording</a>}
  </>
}
