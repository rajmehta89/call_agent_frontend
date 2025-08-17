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

const API_BASE = process.env.NEXT_PUBLIC_CALL_API_URL || 'https://call-agent-backend-ssrw.onrender.com'

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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getInterestBadge = (interest_analysis?: Call['interest_analysis']) => {
    if (!interest_analysis) {
      return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-400 border border-slate-500/30">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[interest_status]}`}>
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

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="flex items-center space-x-3 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-lg">Loading calls...</span>
          </div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Call History</h1>
            <p className="text-slate-400 text-sm sm:text-base">View call details, transcriptions, and analytics</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { icon: <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />,
                title: "Total Calls",
                value: stats.total_calls,
                color: "text-white" },

              { icon: <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />,
                title: "Today",
                value: stats.calls_today,
                color: "text-blue-400" },

              { icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
                title: "Interested",
                value: stats.interest_counts?.interested || 0,
                color: "text-emerald-400" },

              { icon: <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />,
                title: "Not Interested",
                value: stats.interest_counts?.not_interested || 0,
                color: "text-red-400" },

              { icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />,
                title: "Avg Duration",
                value: formatDuration(stats.average_duration),
                color: "text-purple-400" },

              { icon: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
                title: "Completed",
                value: stats.status_counts.completed,
                color: "text-emerald-400" }
            ].map((stat, index) => (
                <div key={index} className="bg-slate-900 rounded-lg border border-slate-800 p-3 sm:p-4 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-medium text-slate-400">{stat.title}</p>
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800">
                      {stat.icon}
                    </div>
                  </div>
                </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                      type="text"
                      placeholder="Search by phone number or lead name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="missed">Missed</option>
                </select>
                <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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

          {/* Calls List */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Call Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Interest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {filteredCalls.length > 0 ? (
                    filteredCalls.map((call) => (
                        <tr key={call._id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-white">{String(call.phone_number || '—')}</div>
                            <div className="text-xs text-slate-400">{formatDate(call.call_date)}</div>
                          </td>
                          <td className="px-4 py-3">
                            {call.lead ? (
                                <div>
                                  <div className="font-medium text-white">{call.lead.name || '—'}</div>
                                  <div className="text-xs text-slate-400">{call.lead.company || '—'}</div>
                                </div>
                            ) : (
                                <span className="text-slate-500">No lead</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(call.status)}
                          </td>
                          <td className="px-4 py-3">
                            {getInterestBadge(call.interest_analysis)}
                          </td>
                          <td className="px-4 py-3 text-white">
                            {formatDuration(call.duration)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                                onClick={() => setSelectedCall(call)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                title="View Details"
                            >
                              <Eye className="w-4 h-4 text-white" />
                            </button>
                          </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Phone className="w-8 h-8 mb-2" />
                          <p>No calls found</p>
                          <p className="text-sm">Calls will appear here after they are completed</p>
                        </div>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden">
              {filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => (
                      <div key={call._id} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-white">{String(call.phone_number || '—')}</div>
                            <div className="text-xs text-slate-400 mb-2">{formatDate(call.call_date)}</div>
                          </div>
                          <button
                              onClick={() => setSelectedCall(call)}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                              title="View Details"
                          >
                            <Eye className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getStatusBadge(call.status)}
                          <span className="text-sm text-slate-400">{formatDuration(call.duration)}</span>
                          {getInterestBadge(call.interest_analysis)}
                        </div>

                        {call.lead && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-white">{call.lead.name}</div>
                              <div className="text-xs text-slate-400">{call.lead.company || '—'}</div>
                            </div>
                        )}
                      </div>
                  ))
              ) : (
                  <div className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Phone className="w-8 h-8 mb-2" />
                      <p>No calls found</p>
                      <p className="text-sm">Calls will appear here after they are completed</p>
                    </div>
                  </div>
              )}
            </div>
          </div>

          {/* Call Details Modal */}
          {selectedCall && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Call Details</h3>
                    <button
                        onClick={() => setSelectedCall(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Phone Number</p>
                      <p className="text-white font-medium">{selectedCall.phone_number}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Duration</p>
                      <p className="text-white font-medium">{formatDuration(selectedCall.duration)}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Status</p>
                      <div>{getStatusBadge(selectedCall.status)}</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="text-white text-sm">{formatDate(selectedCall.call_date)}</p>
                    </div>
                  </div>

                  {selectedCall.lead && (
                      <div className="bg-slate-800 rounded-lg p-4 mb-4">
                        <h4 className="text-white font-medium mb-2">Lead Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Name</p>
                            <p className="text-white">{selectedCall.lead.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Company</p>
                            <p className="text-white">{selectedCall.lead.company || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Email</p>
                            <p className="text-white">{selectedCall.lead.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                  )}

                  {selectedCall.interest_analysis && (
                      <div className="bg-slate-800 rounded-lg p-4 mb-4">
                        <h4 className="text-white font-medium mb-3">Interest Analysis</h4>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {getInterestBadge(selectedCall.interest_analysis)}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Reasoning</p>
                          <p className="text-slate-300 text-sm">{selectedCall.interest_analysis.reasoning}</p>
                        </div>
                        {selectedCall.interest_analysis.key_indicators?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-400 mb-1">Key Indicators</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedCall.interest_analysis.key_indicators.map((indicator, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
                            {indicator}
                          </span>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>
                  )}

                  <div className="bg-slate-800 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-medium mb-2">Call Summary</h4>
                    <p className="text-slate-300 text-sm">{selectedCall.call_summary}</p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Conversation</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {[...selectedCall.transcription, ...selectedCall.ai_responses]
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map((message, i) => (
                              <div key={i} className={`p-3 rounded-lg ${
                                  message.type === 'user'
                                      ? 'bg-blue-600/20 border border-blue-500/30'
                                      : 'bg-slate-700/50 border border-slate-600/30'
                              }`}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-2">
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
                                <p className="text-white text-sm">{message.content}</p>
                              </div>
                          ))}
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  )
}