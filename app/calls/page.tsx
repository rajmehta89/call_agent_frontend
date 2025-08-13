'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, PhoneCall, Clock, User, MessageSquare, 
  Calendar, Search, Filter, Download, Eye,
  Play, Pause, Volume2, FileText, Users,
  TrendingUp, Activity, CheckCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Call {
  _id: string
  phone_number: string | number
  lead_id?: string
  lead?: {
    name: string
    company?: string
    email?: string
  }
  call_date: string
  status: 'completed' | 'failed' | 'missed' | 'initiated'
  duration: number
  transcription: Array<{
    type: 'user' | 'bot' | 'greeting' | 'exit'
    content: string
    timestamp: string
  }>
  ai_responses: Array<{
    type: 'bot' | 'greeting' | 'exit'
    content: string
    timestamp: string
  }>
  call_summary: string
  sentiment: string
  interest_analysis?: {
    interest_status: 'interested' | 'not_interested' | 'neutral'
    confidence: number
    reasoning: string
    key_indicators: string[]
  }
  created_at: string
}

interface CallStats {
  total_calls: number
  calls_today: number
  calls_this_week: number
  average_duration: number
  status_counts: {
    completed: number
    failed: number
    missed: number
  }
  interest_counts?: {
    interested: number
    not_interested: number
    neutral: number
  }
  calls_with_analysis?: number
}

const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'http://localhost:5004'

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [stats, setStats] = useState<CallStats>({
    total_calls: 0,
    calls_today: 0,
    calls_this_week: 0,
    average_duration: 0,
    status_counts: { completed: 0, failed: 0, missed: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [interestFilter, setInterestFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  useEffect(() => {
    loadCalls()
    loadStats()
  }, [])

  const loadCalls = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/calls`)
      const data = await response.json()
      
      if (data.success) {
        setCalls(data.data)
      } else {
        toast.error('Failed to load calls')
      }
    } catch (error) {
      toast.error('Error connecting to backend')
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/calls/stats`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
      failed: 'bg-red-600/20 text-red-400 border border-red-500/30',
      missed: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getInterestBadge = (interest_analysis?: Call['interest_analysis']) => {
    if (!interest_analysis) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-400 border border-slate-500/30">
          No Analysis
        </span>
      )
    }

    const { interest_status, confidence } = interest_analysis
    const styles = {
      interested: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
      not_interested: 'bg-red-600/20 text-red-400 border border-red-500/30',
      neutral: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
    }
    
    const labels = {
      interested: 'Interested',
      not_interested: 'Not Interested',
      neutral: 'Neutral'
    }
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[interest_status]}`}>
          {labels[interest_status]}
        </span>
        <span className="text-xs text-slate-400">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredCalls = calls.filter(call => {
    const phoneStr = String(call.phone_number ?? '')
    const leadName = call.lead?.name ? call.lead.name.toLowerCase() : ''
    const term = searchTerm.toLowerCase()
    const matchesSearch = phoneStr.includes(searchTerm) || leadName.includes(term)
    
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter
    
    const matchesInterest = interestFilter === 'all' || 
      (interestFilter === 'no_analysis' && !call.interest_analysis) ||
      (call.interest_analysis?.interest_status === interestFilter)
    
    return matchesSearch && matchesStatus && matchesInterest
  })

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-emerald-400'
      case 'negative': return 'text-red-400'
      case 'neutral': return 'text-slate-400'
      default: return 'text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-white">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Loading calls...</span>
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
          <h1 className="text-3xl font-bold text-white">Call History</h1>
          <p className="text-slate-400 mt-1">View call details, transcriptions, and analytics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Calls</p>
              <p className="text-2xl font-bold text-white">{stats.total_calls}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Today</p>
              <p className="text-2xl font-bold text-blue-400">{stats.calls_today}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Interested</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.interest_counts?.interested || 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Not Interested</p>
              <p className="text-2xl font-bold text-red-400">{stats.interest_counts?.not_interested || 0}</p>
            </div>
            <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Avg Duration</p>
              <p className="text-2xl font-bold text-purple-400">{formatDuration(stats.average_duration)}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.status_counts.completed}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
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
                placeholder="Search by phone number or lead name..."
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
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="missed">Missed</option>
            </select>
          </div>
          <div>
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">All Interest</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="neutral">Neutral</option>
              <option value="no_analysis">No Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Call Details</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Lead</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Interest</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCalls.map((call, index) => (
                <tr key={call._id} className={`hover:bg-slate-800/50 transition-colors ${index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-white">{String(call.phone_number || '—')}</div>
                      <div className="text-sm text-slate-400">{formatDate(call.call_date)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {call.lead ? (
                      <div>
                        <div className="font-medium text-white">{call.lead.name || '—'}</div>
                        {call.lead.company && (
                          <div className="text-sm text-slate-400">{call.lead.company}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500">No lead</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(call.status)}
                  </td>
                  <td className="px-6 py-4">
                    {getInterestBadge(call.interest_analysis)}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-white">
                        {call.transcription.length} user messages
                      </div>
                      <div className="text-slate-400">
                        {call.ai_responses.length} AI responses
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCalls.length === 0 && (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No calls found</p>
              <p className="text-sm text-slate-500">Calls will appear here after they are completed</p>
            </div>
          )}
        </div>
      </div>

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Call Details</h3>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Call Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-400">Phone Number</div>
                <div className="text-white font-medium">{selectedCall.phone_number}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-400">Duration</div>
                <div className="text-white font-medium">{formatDuration(selectedCall.duration)}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-400">Status</div>
                <div className="text-white font-medium">{getStatusBadge(selectedCall.status)}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-400">Date</div>
                <div className="text-white font-medium">{formatDate(selectedCall.call_date)}</div>
              </div>
            </div>

            {/* Lead Info */}
            {selectedCall.lead && (
              <div className="bg-slate-800 rounded-xl p-4 mb-6">
                <h4 className="text-white font-medium mb-2">Lead Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Name</div>
                    <div className="text-white">{selectedCall.lead.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Company</div>
                    <div className="text-white">{selectedCall.lead.company || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Email</div>
                    <div className="text-white">{selectedCall.lead.email || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Interest Analysis */}
            {selectedCall.interest_analysis && (
              <div className="bg-slate-800 rounded-xl p-4 mb-6">
                <h4 className="text-white font-medium mb-4">Interest Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Interest Level</div>
                    <div className="flex items-center space-x-2">
                      {getInterestBadge(selectedCall.interest_analysis)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Confidence</div>
                    <div className="text-white font-medium">
                      {Math.round(selectedCall.interest_analysis.confidence * 100)}%
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-slate-400 mb-1">Reasoning</div>
                  <p className="text-slate-300 text-sm">{selectedCall.interest_analysis.reasoning}</p>
                </div>
                {selectedCall.interest_analysis.key_indicators.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-400 mb-2">Key Indicators</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCall.interest_analysis.key_indicators.map((indicator, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Call Summary */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <h4 className="text-white font-medium mb-2">Call Summary</h4>
              <p className="text-slate-300">{selectedCall.call_summary}</p>
            </div>

            {/* Conversation */}
            <div className="bg-slate-800 rounded-xl p-4">
              <h4 className="text-white font-medium mb-4">Conversation</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[...selectedCall.transcription, ...selectedCall.ai_responses]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((message, index) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-600/20 border border-blue-500/30' 
                        : 'bg-slate-700/50 border border-slate-600/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {message.type === 'user' ? (
                            <User className="w-4 h-4 text-blue-400" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-emerald-400" />
                          )}
                          <span className={`text-xs font-medium ${
                            message.type === 'user' ? 'text-blue-400' : 'text-emerald-400'
                          }`}>
                            {message.type === 'user' ? 'User' : 'AI'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-white text-sm">{message.content}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 