'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users, Plus, Upload, Phone, Edit, Trash,
  RefreshCw, Download, Filter, Search,
  PhoneCall, CheckCircle, AlertCircle,
  FileText, User, Mail, Building, X, Sparkle, Trophy, UserCheck, List, KanbanSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { COUNTRY_CODE_OPTIONS } from './country-codes'
import { authFetch, titleCase } from '@/components/PlatformUI'
import { PageHeader } from '@/components/OmniPage'
import { Stat } from '@/components/premium'
import { ANY_TIME, DayRangeMenu, inRange, type DayRange } from '@/components/day-range'

interface Lead {
  id: string
  _id?: string  // MongoDB _id field
  name: string
  phone: string
  email: string
  company: string
  notes: string
  status: 'new' | 'qualified' | 'hot' | 'converted' | 'lost' | 'unqualified' | 'called' | 'contacted'
  call_attempts: number
  last_call: string | null
  created_at: string
  updated_at: string
  assigned_to?: string  // owner (team member); admins see every lead, a team member only theirs
}

// Pipeline order for the board and the status chips.
const LEAD_STATUSES = [
  { id: 'new', label: 'New' }, { id: 'qualified', label: 'Qualified' }, { id: 'hot', label: 'Hot' }, { id: 'called', label: 'Called' },
  { id: 'contacted', label: 'Contacted' }, { id: 'converted', label: 'Converted' }, { id: 'lost', label: 'Lost' }, { id: 'unqualified', label: 'Unqualified' },
]
const statusLabel = (id: string) => LEAD_STATUSES.find((item) => item.id === id)?.label || id.charAt(0).toUpperCase() + id.slice(1)
/** Browser and web test callers have technical ids; show what they are instead. */
const contactLabel = (phone: string) => phone.startsWith('client:browser_') ? 'Browser test call' : phone.startsWith('web:') ? 'Web call' : phone

function StatusPill({ status }: { status: string }) {
  const strong = status === 'converted' || status === 'hot'
  const muted = status === 'lost' || status === 'unqualified'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${strong ? 'bg-[#6C3BFF] text-white' : muted ? 'bg-slate-100 text-slate-500' : 'bg-[#F1EBFF] text-[#6C3BFF]'}`}><span className={`h-1.5 w-1.5 rounded-full ${strong ? 'bg-white' : muted ? 'bg-slate-400' : 'bg-[#6C3BFF]'}`} />{statusLabel(status)}</span>
}

/** Pipeline board: one column per status; move a lead with the select on its card. */
function LeadBoard({ leads, ownerName, onMove }: { leads: Lead[]; ownerName: (id?: string) => string; onMove: (lead: Lead, status: string) => void }) {
  const columns = LEAD_STATUSES.filter((column) => !['lost', 'unqualified'].includes(column.id) || leads.some((lead) => lead.status === column.id))
  return <div className="mb-8 flex items-start gap-4 overflow-x-auto pb-2">{columns.map((column) => { const items = leads.filter((lead) => lead.status === column.id); return <section key={column.id} className="flex w-72 shrink-0 flex-col rounded-2xl border border-[#E9DFFF] bg-[#F8F5FF]">
    <header className="flex items-center justify-between px-4 py-3"><StatusPill status={column.id} /><span className="text-xs font-bold text-slate-400">{items.length}</span></header>
    <div className="flex-1 space-y-2 px-3 pb-3">{items.length ? items.map((lead) => <article key={lead._id || lead.id} className="rounded-xl border border-[#E9DFFF] bg-white p-3 shadow-[0_10px_24px_-22px_rgba(73,35,117,.7)] transition hover:border-[#D8C8FF]">
      <Link href={`/leads/${lead._id || lead.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-[#6C3BFF]">{lead.name}</Link>
      <div className="mt-0.5 truncate text-xs text-slate-500">{contactLabel(lead.phone)}{lead.company ? ` · ${lead.company}` : ''}</div>
      <div className="mt-2.5 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-slate-400">{ownerName(lead.assigned_to)}{lead.last_call ? ` · ${new Date(lead.last_call).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</span>
        <select value={lead.status} onChange={(event) => onMove(lead, event.target.value)} aria-label={`Move ${lead.name}`} className="h-7 min-h-0 w-auto rounded-md py-0 pl-2 pr-7 text-[11px]">{LEAD_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    </article>) : <p className="rounded-xl border border-dashed border-[#E9DFFF] px-3 py-6 text-center text-xs text-slate-400">No leads</p>}</div>
  </section> })}</div>
}

interface LeadStats {
  total: number
  new: number
  called: number
  contacted: number
  converted: number
  total_calls: number
}

const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || process.env.NEXT_PUBLIC_LEAD_API_URL || 'http://127.0.0.1:8000'

const toInternationalPhone = (countryCode: string, value: string) => {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return ''
  if (trimmed.startsWith('+')) return `+${digits}`
  if (trimmed.startsWith('00')) return `+${digits.slice(2)}`

  return `${countryCode}${digits.replace(/^0+/, '')}`
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [view, setView] = useState<'table' | 'board'>('table')
  // Owners: admins pick who owns each lead; team members only see their own (filtered by the backend).
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    authFetch(`${API_BASE}/api/inbox/members`).then(async (response) => {
      if (!response.ok) return
      const payload = await response.json()
      setIsAdmin(Boolean(payload.can_assign))
      setOwners((payload.data || []).filter((member: any) => member.assignable).map((member: any) => ({ id: member.id, name: titleCase(member.name || '') })))
    }).catch(() => {})
  }, [])
  const ownerName = (id?: string) => owners.find((owner) => owner.id === id)?.name || (id ? 'Former member' : 'Unassigned')
  const setOwner = async (lead: Lead, ownerId: string) => {
    const id = lead._id || lead.id
    try {
      const response = await authFetch(`${API_BASE}/api/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_to: ownerId }) })
      if (!response.ok) throw new Error((await response.json()).detail?.error || 'Could not change the owner')
      setLeads((current) => current.map((item) => (item._id || item.id) === id ? { ...item, assigned_to: ownerId || undefined } : item))
      toast.success(ownerId ? `Lead given to ${ownerName(ownerId)}` : 'Lead unassigned')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not change the owner') }
  }
  const [stats, setStats] = useState<LeadStats>({
    total: 0, new: 0, called: 0, contacted: 0, converted: 0, total_calls: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  // Links from the sidebar: ?view=board (Funnels) opens the pipeline board, ?new=1 (New → Add a lead) opens the form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'board') setView('board')
    if (params.get('new') === '1') setShowAddForm(true)
  }, [])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [range, setRange] = useState<DayRange>(ANY_TIME)  // leads that called or were added in these days
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
    email: '',
    company: '',
    notes: ''
  })

  useEffect(() => {
    loadLeads()
  }, [searchTerm, statusFilter])

  useEffect(() => {
    loadStats()
  }, [])

  const loadLeads = async () => {
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const response = await authFetch(`${API_BASE}/api/leads/?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        // Transform MongoDB _id to id for frontend compatibility
        const transformedLeads = data.data.map((lead: any) => ({
          ...lead,
          id: lead._id || lead.id // Use _id from MongoDB or fallback to id
        }))
        setLeads(transformedLeads)
      } else {
        toast.error('Failed to load leads')
      }
    } catch (error) {
      toast.error('Error connecting to backend')
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/leads/stats`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const phone = toInternationalPhone(formData.countryCode, formData.phone)
      if (!phone) {
        toast.error('Phone number is required')
        return
      }
      const response = await authFetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone,
          email: formData.email,
          company: formData.company,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const newLead = {
          ...data.data,
          id: data.data._id || data.data.id
        }
        setLeads([newLead, ...leads])
        setFormData({ name: '', countryCode: '+91', phone: '', email: '', company: '', notes: '' })
        setShowAddForm(false)
        toast.success('Lead added successfully!')
        loadStats()
      } else {
        toast.error(data.error || 'Failed to add lead')
      }
    } catch (error) {
      toast.error('Error adding lead')
      console.error('Error adding lead:', error)
    }
  }

  const handleUpdateLead = async (lead: Lead) => {
    try {
      const leadId = lead._id || lead.id
      if (!leadId) {
        toast.error('Invalid lead ID')
        return
      }

      const response = await authFetch(`${API_BASE}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          company: lead.company,
          notes: lead.notes,
          status: lead.status
        }),
      })

      const data = await response.json()

      if (data.success) {
        const updatedLead = {
          ...data.data,
          id: data.data._id || data.data.id
        }
        setLeads(leads.map(l => (l._id === leadId || l.id === leadId) ? updatedLead : l))
        setEditingLead(null)
        toast.success('Lead updated successfully!')
        loadStats()
      } else {
        toast.error(data.error || 'Failed to update lead')
      }
    } catch (error) {
      toast.error('Error updating lead')
      console.error('Error updating lead:', error)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      const response = await authFetch(`${API_BASE}/api/leads/${leadId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setLeads(leads.filter(l => (l._id !== leadId && l.id !== leadId)))
        toast.success('Lead deleted successfully!')
        loadStats()
      } else {
        toast.error(data.error || 'Failed to delete lead')
      }
    } catch (error) {
      toast.error('Error deleting lead')
      console.error('Error deleting lead:', error)
    }
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await authFetch(`${API_BASE}/api/leads/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        await loadLeads()
        await loadStats()
        toast.success(`Successfully imported ${data.imported_count} leads`)

        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} rows had errors`)
        }
      } else {
        toast.error(data.error || 'Failed to upload CSV')
      }
    } catch (error) {
      toast.error('Error uploading CSV')
      console.error('Error uploading CSV:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getStatusBadge = (status: string) => <StatusPill status={status} />

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesDay = inRange(range, lead.last_call) || inRange(range, lead.created_at)

    return matchesSearch && matchesStatus && matchesDay
  })

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2 text-slate-900">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading leads...</span>
          </div>
        </div>
    )
  }

  return (
      <div>
        <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
        <PageHeader title="Leads" description="Every caller becomes a lead automatically. Track where each one is, who owns it, and jump to their conversation."
          actions={<>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="CSV columns: name,phone,email,company,notes (name and phone required)" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E9DFFF] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#6C3BFF] disabled:opacity-60">{uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Uploading…' : 'Import CSV'}</button>
            <button type="button" onClick={() => setShowAddForm(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6C3BFF] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(150,77,234,.9)] transition hover:bg-[#5A2BE6]"><Plus className="h-4 w-4" />Add lead</button>
          </>} />

        {/* Stats */}
        <div className="keep-cols mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <Stat icon={Users} label="Total leads" value={stats.total} hint={isAdmin ? 'in the workspace' : 'assigned to you'} />
          <Stat icon={Sparkle} label="New" value={stats.new} hint="not contacted yet" tone={stats.new ? 'alert' : 'default'} />
          <Stat icon={Phone} label="Calls" value={stats.total_calls} hint="from these leads" />
          <Stat icon={CheckCircle} label="Contacted" value={stats.contacted} hint="had a conversation" />
          <Stat icon={Trophy} label="Converted" value={stats.converted} hint={stats.total ? `${Math.round((stats.converted / stats.total) * 100)}% conversion` : 'no leads yet'} />
          <Stat icon={UserCheck} label="With an owner" value={leads.filter((lead) => lead.assigned_to).length} hint={`${leads.filter((lead) => !lead.assigned_to).length} unassigned`} />
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E9DFFF] bg-white p-3 shadow-[0_18px_40px_-34px_rgba(73,35,117,.55)] lg:flex-row lg:items-center">
          <DayRangeMenu value={range} onChange={setRange} className="shrink-0 lg:w-44" />
          <div className="relative min-w-0 lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search name, number, email, company" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-[#F8F5FF] pl-9 text-sm" /></div>
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">{['all', ...LEAD_STATUSES.map((item) => item.id)].map((id) => { const count = id === 'all' ? leads.length : leads.filter((lead) => lead.status === id).length; if (id !== 'all' && !count && statusFilter !== id) return null; const active = statusFilter === id; return <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${active ? 'bg-[#6C3BFF] text-white' : 'bg-[#F1EBFF] text-slate-600 hover:bg-[#E9DFFF]'}`}>{id === 'all' ? 'All' : statusLabel(id)}<span className={active ? 'text-white/70' : 'text-slate-400'}>{count}</span></button> })}</div>
          <div className="flex shrink-0 rounded-xl bg-[#F1EBFF] p-1">{(['table', 'board'] as const).map((mode) => <button key={mode} type="button" onClick={() => setView(mode)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold capitalize transition ${view === mode ? 'bg-white text-[#5A2BE6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{mode === 'table' ? <List className="h-3.5 w-3.5" /> : <KanbanSquare className="h-3.5 w-3.5" />}{mode}</button>)}</div>
        </div>

        {view === 'board' && <LeadBoard leads={filteredLeads} ownerName={ownerName} onMove={(lead, status) => handleUpdateLead({ ...lead, status: status as Lead['status'] })} />}

        {/* Leads Table */}
        {view === 'table' && <div className="mb-8 overflow-hidden rounded-2xl border border-[#E9DFFF] bg-white shadow-[0_18px_40px_-34px_rgba(73,35,117,.55)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-rd-surface border-b border-rd-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Lead</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Contact</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Owner</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Calls</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Last Call</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Actions</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
              {filteredLeads.map((lead) => (
                  <tr key={lead._id || lead.id} className="hover:bg-rd-surface transition-colors bg-white">
                    <td className="px-4 py-2">
                      <div>
                        <Link href={`/leads/${lead.id}`} className="text-[13.5px] font-semibold text-slate-900 hover:text-purple-700">{lead.name}</Link>
                        {lead.company && (
                            <div className="text-xs md:text-sm text-slate-400 flex items-center mt-1">
                              <Building className="w-3 h-3 mr-1" />
                              {lead.company}
                            </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-xs md:text-sm">
                        <div className="flex items-center text-slate-900">
                          <Phone className="w-3 h-3 mr-1" />
                          {contactLabel(lead.phone)}
                        </div>
                        {lead.email && (
                            <div className="flex items-center text-slate-400 mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {lead.email}
                            </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[13px]">
                      {isAdmin ? <select value={lead.assigned_to || ''} onChange={(event) => setOwner(lead, event.target.value)} aria-label={`Owner of ${lead.name}`} className="h-8 min-h-0 w-auto rounded-md py-0 pl-2 pr-8 text-xs"><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>
                        : <span className="text-slate-500">{ownerName(lead.assigned_to)}</span>}
                    </td>
                    <td className="px-4 py-2">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-4 py-2 text-[13px] text-slate-900">
                      {lead.call_attempts}
                    </td>
                    <td className="px-4 py-2 text-[13px] text-slate-400">
                      {lead.last_call ? new Date(lead.last_call).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setEditingLead(lead)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E9DFFF] bg-white text-[#6C3BFF] transition hover:border-[#6C3BFF] hover:bg-[#F8F5FF]"
                            title="Edit lead" aria-label={`Edit ${lead.name || 'lead'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => handleDeleteLead(lead._id || lead.id || '')}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[#75658F] transition hover:border-[#E9DFFF] hover:bg-[#F1EBFF] hover:text-[#5A2BE6]"
                            title="Delete lead" aria-label={`Delete ${lead.name || 'lead'}`}
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 md:w-12 md:h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm md:text-base">No leads found</p>
                  <p className="text-xs md:text-sm text-slate-500">Add leads manually or upload a CSV file</p>
                </div>
            )}
          </div>
        </div>}

        {/* Add Lead Modal */}
        {showAddForm && (
            <div className="fixed inset-0 bg-[rgba(50,19,107,.28)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl border border-rd-border p-4 md:p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Add New Lead</h3>
                  <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddLead} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Phone *</label>
                    <div className="grid grid-cols-[minmax(135px,0.9fr)_minmax(0,1.5fr)] gap-2">
                      <select
                          aria-label="Country code"
                          value={formData.countryCode}
                          onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                          className="w-full px-2 py-2 bg-white border border-rd-border rounded-xl text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                      >
                        {COUNTRY_CODE_OPTIONS.map(({ region, code, name }) => (
                          <option key={`${region}-${code}`} value={code}>
                            {name} ({code})
                          </option>
                        ))}
                      </select>
                      <input
                          type="tel"
                          required
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="Phone number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Choose the country, then enter the local number. It will be saved for international calling.</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Company</label>
                    <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div className="flex space-x-3 pt-2 md:pt-4">
                    <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl transition-all text-sm md:text-base"
                    >
                      Add Lead
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false)
                          setFormData({ name: '', countryCode: '+91', phone: '', email: '', company: '', notes: '' })
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl transition-all text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Edit Lead Modal */}
        {editingLead && (
            <div className="fixed inset-0 bg-[rgba(50,19,107,.28)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl border border-rd-border p-4 md:p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Edit Lead</h3>
                  <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateLead(editingLead); }} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Name *</label>
                    <input
                        type="text"
                        required
                        value={editingLead.name}
                        onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Phone *</label>
                    <input
                        type="tel"
                        required
                        value={editingLead.phone}
                        onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Email</label>
                    <input
                        type="email"
                        value={editingLead.email}
                        onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Company</label>
                    <input
                        type="text"
                        value={editingLead.company}
                        onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Status</label>
                    <select
                        value={editingLead.status}
                        onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as Lead['status'] })}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    >
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="hot">Hot</option>
                      <option value="called">Called</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="unqualified">Unqualified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1">Notes</label>
                    <textarea
                        value={editingLead.notes}
                        onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-rd-border rounded-xl text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    />
                  </div>
                  <div className="flex space-x-3 pt-2 md:pt-4">
                    <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl transition-all text-sm md:text-base"
                    >
                      Update Lead
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditingLead(null)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl transition-all text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

      </div>
  )
}
