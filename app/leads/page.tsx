'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Users, Plus, Upload, Phone, Edit, Trash, 
  RefreshCw, Download, Filter, Search, 
  PhoneCall, Calendar, CheckCircle, AlertCircle,
  FileText, User, Mail, Building, PhoneIcon, X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Lead {
  id: string
  _id?: string  // MongoDB _id field
  name: string
  phone: string
  email: string
  company: string
  notes: string
  status: 'new' | 'called' | 'contacted' | 'converted'
  call_attempts: number
  last_call: string | null
  created_at: string
  updated_at: string
}

interface LeadStats {
  total: number
  new: number
  called: number
  contacted: number
  converted: number
  total_calls: number
}
const API_BASE = process.env.NEXT_PUBLIC_LEAD_API_URL || 'https://call-agent-backend-ssrw.onrender.com'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<LeadStats>({
    total: 0, new: 0, called: 0, contacted: 0, converted: 0, total_calls: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [uploading, setUploading] = useState(false)
  
  // Call All functionality state
  const [isCallingAll, setIsCallingAll] = useState(false)
  const [callAllProgress, setCallAllProgress] = useState({
    currentIndex: 0,
    currentLead: null as Lead | null,
    totalCalls: 0,
    completedCalls: 0,
    failedCalls: 0
  })
  const [showCallModal, setShowCallModal] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: ''
  })

  useEffect(() => {
    loadLeads()
    loadStats()
  }, [])

  const loadLeads = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/leads`)
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
      const response = await fetch(`${API_BASE}/api/leads/stats`)
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
      const response = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        const newLead = {
          ...data.data,
          id: data.data._id || data.data.id
        }
        setLeads([newLead, ...leads])
        setFormData({ name: '', phone: '', email: '', company: '', notes: '' })
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

      const response = await fetch(`${API_BASE}/api/leads/${leadId}`, {
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
      const response = await fetch(`${API_BASE}/api/leads/${leadId}`, {
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

  const handleCallLead = async (lead: Lead) => {
    try {
      // Ensure we have a valid lead ID
      const leadId = lead._id || lead.id
      if (!leadId) {
        toast.error('Invalid lead ID')
        return
      }

      const response = await fetch(`${API_BASE}/api/leads/${leadId}/call`, {
        method: 'POST',
      })

      const data = await response.json()
      if (data.success) {
        // Update the lead in the list with the new data
        const updatedLead = data.data.lead
        if (updatedLead) {
          setLeads(leads.map(l => (l.id === leadId || l._id === leadId) ? {
            ...updatedLead,
            id: updatedLead._id || updatedLead.id
          } : l))
        }
        toast.success(`Call initiated to ${lead.name}`)
        loadStats()
        // Schedule refreshes to reflect webhook updates (answer -> contacted)
        setTimeout(() => { loadLeads(); loadStats(); }, 3000)
        setTimeout(() => { loadLeads(); loadStats(); }, 8000)
      } else {
        toast.error(data.error || 'Failed to initiate call')
      }
    } catch (error) {
      toast.error('Error initiating call')
      console.error('Error calling lead:', error)
    }
  }

  const checkCallCompletion = async (leadId: string): Promise<boolean> => {
    try {
      // Check if there are active calls for this lead
      const response = await fetch(`${API_BASE}/api/calls?lead_id=${leadId}&limit=1`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        const latestCall = data.data[0]
        // Check if the call is completed (status is completed or failed, and has duration)
        return latestCall.status === 'completed' || latestCall.status === 'failed'
      }
      
      // If no call records found, consider it completed (might be an error case)
      return true
    } catch (error) {
      console.error('Error checking call completion:', error)
      // If we can't check, assume it's completed to avoid infinite waiting
      return true
    }
  }

  const waitForCallCompletion = async (leadId: string, maxWaitTime: number = 120000): Promise<void> => {
    const startTime = Date.now()
    const pollInterval = 2000 // Check every 2 seconds
    
    return new Promise((resolve) => {
      const pollForCompletion = async () => {
        const elapsed = Date.now() - startTime
        
        // If max wait time exceeded, resolve anyway
        if (elapsed >= maxWaitTime) {
          console.log(`Max wait time exceeded for lead ${leadId}`)
          resolve()
          return
        }
        
        const isCompleted = await checkCallCompletion(leadId)
        
        if (isCompleted) {
          resolve()
        } else {
          // Continue polling
          setTimeout(pollForCompletion, pollInterval)
        }
      }
      
      // Start polling
      pollForCompletion()
    })
  }

  const handleCallAll = async () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to call')
      return
    }

    if (isCallingAll) {
      toast.error('Call All is already in progress')
      return
    }

    setIsCallingAll(true)
    setShowCallModal(true)
    setCallAllProgress({
      currentIndex: 0,
      currentLead: null,
      totalCalls: filteredLeads.length,
      completedCalls: 0,
      failedCalls: 0
    })

    try {
      for (let i = 0; i < filteredLeads.length; i++) {
        const lead = filteredLeads[i]
        
        // Update progress to show current lead being called
        setCallAllProgress(prev => ({
          ...prev,
          currentIndex: i,
          currentLead: lead
        }))

        try {
          // Initiate call to current lead
          const leadId = lead._id || lead.id
          if (!leadId) {
            console.error(`No valid ID for lead ${lead.name}`)
            setCallAllProgress(prev => ({ ...prev, failedCalls: prev.failedCalls + 1 }))
            continue
          }

          const response = await fetch(`${API_BASE}/api/leads/${leadId}/call`, {
            method: 'POST',
          })

          const data = await response.json()
          
          if (data.success) {
            // Update the lead in the list
            const updatedLead = data.data.lead
            if (updatedLead) {
              setLeads(prevLeads => prevLeads.map(l => (l.id === leadId || l._id === leadId) ? {
                ...updatedLead,
                id: updatedLead._id || updatedLead.id
              } : l))
            }

            // Wait for call to complete before proceeding to next lead
            await waitForCallCompletion(leadId)
            
            setCallAllProgress(prev => ({ ...prev, completedCalls: prev.completedCalls + 1 }))
          } else {
            console.error(`Failed to call ${lead.name}: ${data.error}`)
            setCallAllProgress(prev => ({ ...prev, failedCalls: prev.failedCalls + 1 }))
          }
        } catch (error) {
          console.error(`Error calling ${lead.name}:`, error)
          setCallAllProgress(prev => ({ ...prev, failedCalls: prev.failedCalls + 1 }))
        }

        // Small delay between calls for safety
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // All calls completed
      toast.success(`Call All completed! ${callAllProgress.completedCalls + filteredLeads.length - callAllProgress.failedCalls} successful, ${callAllProgress.failedCalls} failed`)
      
      // Refresh leads and stats
      await loadLeads()
      await loadStats()
      
    } catch (error) {
      console.error('Error in Call All:', error)
      toast.error('Call All process encountered an error')
    } finally {
      setIsCallingAll(false)
      // Keep modal open for a moment to show final results
      setTimeout(() => {
        setShowCallModal(false)
        setCallAllProgress({
          currentIndex: 0,
          currentLead: null,
          totalCalls: 0,
          completedCalls: 0,
          failedCalls: 0
        })
      }, 3000)
    }
  }

  const handleStopCallAll = () => {
    setIsCallingAll(false)
    setShowCallModal(false)
    toast('Call All stopped', { icon: 'ℹ️' })
    setCallAllProgress({
      currentIndex: 0,
      currentLead: null,
      totalCalls: 0,
      completedCalls: 0,
      failedCalls: 0
    })
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/api/leads/upload`, {
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

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
      called: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
      contacted: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
      converted: 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone.includes(searchTerm) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-white">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading leads...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads Management</h1>
          <p className="text-slate-400 mt-1">Manage your leads, upload CSV files, and initiate calls</p>
        </div>
        <div className="flex space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl transition-all"
          >
            {uploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
          </button>
          <button
            onClick={handleCallAll}
            disabled={isCallingAll || filteredLeads.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-xl transition-all"
          >
            {isCallingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PhoneCall className="w-4 h-4" />
            )}
            <span>{isCallingAll ? 'Calling...' : `Call All (${filteredLeads.length})`}</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">New</p>
              <p className="text-2xl font-bold text-blue-400">{stats.new}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Called</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.called}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Contacted</p>
              <p className="text-2xl font-bold text-purple-400">{stats.contacted}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Converted</p>
              <p className="text-2xl font-bold text-orange-400">{stats.converted}</p>
            </div>
            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Calls</p>
              <p className="text-2xl font-bold text-slate-400">{stats.total_calls}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="called">Called</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Lead</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Calls</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Last Call</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLeads.map((lead) => (
                <tr key={lead._id || lead.id} className="hover:bg-slate-800/50 transition-colors bg-slate-900">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-white">{lead.name}</div>
                      {lead.company && (
                        <div className="text-sm text-slate-400 flex items-center mt-1">
                          <Building className="w-3 h-3 mr-1" />
                          {lead.company}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center text-white">
                        <Phone className="w-3 h-3 mr-1" />
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center text-slate-400 mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {lead.call_attempts}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {lead.last_call ? new Date(lead.last_call).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCallLead(lead)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all"
                        title="Call Lead"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all"
                        title="Edit Lead"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead._id || lead.id || '')}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                        title="Delete Lead"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No leads found</p>
              <p className="text-sm text-slate-500">Add leads manually or upload a CSV file</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl transition-all"
                >
                  Add Lead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ name: '', phone: '', email: '', company: '', notes: '' })
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-xl transition-all"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Lead</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateLead(editingLead); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={editingLead.phone}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                <input
                  type="email"
                  value={editingLead.email}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Company</label>
                <input
                  type="text"
                  value={editingLead.company}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Status</label>
                <select
                  value={editingLead.status}
                  onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as Lead['status'] })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="new">New</option>
                  <option value="called">Called</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Notes</label>
                <textarea
                  value={editingLead.notes}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition-all"
                >
                  Update Lead
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automated Status Flow Info */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
        <h4 className="font-semibold text-white mb-3 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Automated Lead Status Flow
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm font-medium text-blue-400">New</div>
            <div className="text-xs text-slate-400 mt-1">Fresh leads</div>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Phone className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-medium text-emerald-400">Called</div>
            <div className="text-xs text-slate-400 mt-1">Call initiated</div>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-medium text-purple-400">Contacted</div>
            <div className="text-xs text-slate-400 mt-1">User answered</div>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-sm font-medium text-orange-400">Converted</div>
            <div className="text-xs text-slate-400 mt-1">Showed interest</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Lead status automatically updates based on call activity and AI-powered interest analysis
        </p>
      </div>

      {/* CSV Upload Instructions */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h4 className="font-semibold text-white mb-2 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          CSV Upload Format
        </h4>
        <p className="text-sm text-slate-400 mb-2">
          Your CSV file should have the following columns (name and phone are required):
        </p>
        <div className="text-sm text-slate-300 font-mono bg-slate-800 p-3 rounded-xl border border-slate-700">
          name,phone,email,company,notes
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Example: John Doe,+1234567890,john@company.com,Acme Corp,Interested in premium package
        </p>
      </div>

      {/* Call All Progress Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 w-full max-w-md shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {isCallingAll ? (
                  <PhoneIcon className="w-8 h-8 text-orange-400 animate-pulse" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                )}
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                {isCallingAll ? 'Calling Leads' : 'Call All Completed'}
              </h3>
              
              {callAllProgress.currentLead && (
                <div className="mb-4">
                  <p className="text-slate-300 text-sm mb-1">Currently calling:</p>
                  <p className="text-white font-medium">{callAllProgress.currentLead.name}</p>
                  <p className="text-slate-400 text-sm">{callAllProgress.currentLead.phone}</p>
                </div>
              )}
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{callAllProgress.currentIndex + 1} of {callAllProgress.totalCalls}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((callAllProgress.currentIndex + 1) / callAllProgress.totalCalls) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{callAllProgress.completedCalls}</div>
                  <div className="text-xs text-slate-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{callAllProgress.failedCalls}</div>
                  <div className="text-xs text-slate-400">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-400">
                    {callAllProgress.totalCalls - callAllProgress.completedCalls - callAllProgress.failedCalls}
                  </div>
                  <div className="text-xs text-slate-400">Remaining</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                {isCallingAll ? (
                  <button
                    onClick={handleStopCallAll}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <X className="w-4 h-4" />
                      <span>Stop</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-xl transition-all"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 