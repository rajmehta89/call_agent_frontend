'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/OmniPage'
import { ActionButton, api, DataState, downloadCsv, StatusBadge, Toolbar } from '@/components/PlatformUI'

const customerStatuses = ['none', 'new', 'qualified', 'hot', 'called', 'contacted', 'converted', 'lost', 'unqualified']

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', location: '', tags: [], notes: '' })

  const load = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ limit: '500' })
    if (search.trim()) params.set('search', search.trim())
    if (status) params.set('status', status)
    api(`/api/platform/customers?${params.toString()}`)
      .then((payload) => setRows(payload.data || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load customers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [search, status])

  const create = async () => {
    try {
      await api('/api/platform/customers', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Customer created')
      setShow(false)
      setForm({ name: '', phone: '', email: '', location: '', tags: [], notes: '' })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed')
    }
  }

  return <div className="space-y-7">
    <PageHeader title="Customers" description="People who have interacted with your business through WhatsApp, Voice, or Shopify. A customer can also have a separate lead record while they are being qualified." />
    <Toolbar search={search} onSearch={setSearch} onRefresh={load} onExport={() => downloadCsv('customers')}>
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter customers by lead status">
        <option value="">All customers</option>
        {customerStatuses.map((value) => <option key={value} value={value}>{value === 'none' ? 'No lead' : `${value.charAt(0).toUpperCase()}${value.slice(1)} lead`}</option>)}
      </select>
      <ActionButton primary onClick={() => setShow(!show)} icon={<Plus className="h-4 w-4" />}>Add customer</ActionButton>
    </Toolbar>
    {show && <div className="surface-panel grid gap-4 rounded-[24px] p-5 md:grid-cols-3">
      <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      <textarea className="md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <ActionButton primary onClick={create}>Create customer</ActionButton>
    </div>}
    <DataState loading={loading} error={error} empty={!rows.length} onRetry={load}>
      <div className="surface-panel overflow-x-auto rounded-[24px]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="p-4">Name</th><th>Contact</th><th>Channels</th><th>Lead status</th><th>Orders</th><th>Last interaction</th><th>Tags</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row._id} className="border-b border-slate-100 last:border-0">
            <td className="p-4"><Link href={`/customers/${row._id}`} className="font-semibold text-slate-900 hover:text-[#b45309]">{row.name || 'Unnamed customer'}</Link></td>
            <td><div className="text-slate-700">{row.phone || '—'}</div><div className="text-xs text-slate-500">{row.email || 'No email'}</div></td>
            <td className="text-slate-600">{(row.channels || []).join(', ') || '—'}</td>
            <td><StatusBadge value={row.lead_status || 'None'} /></td>
            <td className="text-slate-600">{row.orders_count || 0}</td>
            <td className="text-slate-600">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB') : '—'}</td>
            <td className="text-slate-600">{(row.tags || []).join(', ') || '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </DataState>
  </div>
}
