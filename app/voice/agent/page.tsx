'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState } from '@/components/PlatformUI'

export default function Page() {
	const [config, setConfig] = useState<any>({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const load = () => {
		setLoading(true)
		api('/api/config/').then(setConfig).catch((exception) => setError(exception.message)).finally(() => setLoading(false))
	}

	useEffect(() => { load() }, [])

	const save = async () => {
		try {
			const result = await api('/api/config/', { method: 'PUT', body: JSON.stringify({
				greeting_message: config.greeting_message,
				exit_message: config.exit_message,
				system_prompt: config.system_prompt,
				human_transfer: config.human_transfer,
			}) })
			setConfig(result.data || config)
			toast.success('Inbound voice agent saved')
		} catch (exception) {
			toast.error(exception instanceof Error ? exception.message : 'Save failed')
		}
	}

	const transfer = config.human_transfer || { enabled: true, agents: [] }
	const contact = transfer.agents?.[0] || { name: 'Human team', phone_number: '' }

	return <div className="space-y-6">
		<PageHeader title="Inbound voice agent" description="Configure how the AI greets callers and when it hands a call to your team." />
		<DataState loading={loading} error={error} onRetry={load}>
			<section className="surface-panel grid gap-5 rounded-[22px] p-5 md:grid-cols-2">
				<label className="block"><span className="field-label">Greeting</span><textarea rows={3} value={config.greeting_message || ''} onChange={(event) => setConfig({ ...config, greeting_message: event.target.value })} /></label>
				<label className="block"><span className="field-label">Goodbye message</span><textarea rows={3} value={config.exit_message || ''} onChange={(event) => setConfig({ ...config, exit_message: event.target.value })} /></label>
				<label className="block md:col-span-2"><span className="field-label">Agent instructions</span><textarea rows={8} value={config.system_prompt || ''} onChange={(event) => setConfig({ ...config, system_prompt: event.target.value })} /></label>
				<label className="block"><span className="field-label">Human handoff number</span><input value={contact.phone_number || ''} placeholder="+14155550123" onChange={(event) => setConfig({ ...config, human_transfer: { ...transfer, agents: [{ ...contact, phone_number: event.target.value }] } })} /></label>
				<label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={transfer.enabled !== false} onChange={(event) => setConfig({ ...config, human_transfer: { ...transfer, enabled: event.target.checked } })} />Enable human handoff</label>
				<div className="md:col-span-2"><ActionButton primary onClick={save}>Save voice settings</ActionButton></div>
			</section>
		</DataState>
	</div>
}
