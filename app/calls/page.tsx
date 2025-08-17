import { useState, useEffect } from 'react'
import {
  Phone, PhoneCall, Clock, User, MessageSquare,
  Calendar, Search, Filter, Download, Eye,
  Play, Pause, Volume2, FileText, Users,
  TrendingUp, Activity, CheckCircle, XCircle,
  Menu, X
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useIsMobile } from '@/hooks/use-mobile'

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

const API_BASE = import.meta.env.VITE_CALL_API_URL || 'https://call-agent-backend-ssrw.onrender.com'

export default function VoiceAnalytics() {
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
  const [showFilters, setShowFilters] = useState(false)
  const isMobile = useIsMobile()

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
      completed: 'bg-success/20 text-success border-success/30',
      failed: 'bg-error/20 text-error border-error/30',
      missed: 'bg-warning/20 text-warning border-warning/30'
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getInterestBadge = (interest_analysis?: Call['interest_analysis']) => {
    if (!interest_analysis) {
      return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
          No Analysis
        </span>
      )
    }

    const { interest_status, confidence } = interest_analysis
    const styles = {
      interested: 'bg-success/20 text-success border-success/30',
      not_interested: 'bg-error/20 text-error border-error/30',
      neutral: 'bg-warning/20 text-warning border-warning/30'
    }

    const labels = {
      interested: 'Interested',
      not_interested: 'Not Interested',
      neutral: 'Neutral'
    }

    return (
        <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[interest_status]}`}>
          {labels[interest_status]}
        </span>
          <span className="text-xs text-muted-foreground">
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
        <div className="min-h-screen bg-background p-4">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2 text-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Loading calls...</span>
            </div>
          </div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-background">
        <Toaster position="top-right" />

        <div className="p-4 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Voice Analytics</h1>
              <p className="text-muted-foreground mt-1">View call details, transcriptions, and analytics</p>
            </div>

            {isMobile && (
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.total_calls}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Today</p>
                  <p className="text-lg sm:text-2xl font-bold text-analytics-blue">{stats.calls_today}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-analytics-blue/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-analytics-blue" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Interested</p>
                  <p className="text-lg sm:text-2xl font-bold text-success">{stats.interest_counts?.interested || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Not Interested</p>
                  <p className="text-lg sm:text-2xl font-bold text-error">{stats.interest_counts?.not_interested || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-error/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-error" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-lg sm:text-2xl font-bold text-analytics-purple">{formatDuration(stats.average_duration)}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-analytics-purple/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-analytics-purple" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-lg sm:text-2xl font-bold text-success">{stats.status_counts.completed}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`bg-card rounded-xl border border-border p-4 transition-all ${!isMobile || showFilters ? 'block' : 'hidden'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                      type="text"
                      placeholder="Search by phone number or lead name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:flex lg:space-x-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="missed">Missed</option>
                </select>
                <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    className="px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
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

          {/* Calls List - Desktop Table / Mobile Cards */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {isMobile ? (
                // Mobile Cards View
                <div className="divide-y divide-border">
                  {filteredCalls.map((call) => (
                      <div key={call._id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{String(call.phone_number || '—')}</div>
                            <div className="text-sm text-muted-foreground">{formatDate(call.call_date)}</div>
                          </div>
                          <button
                              onClick={() => setSelectedCall(call)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg transition-all ml-3"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Lead</div>
                            <div className="text-sm font-medium text-foreground">
                              {call.lead?.name || 'No lead'}
                            </div>
                            {call.lead?.company && (
                                <div className="text-xs text-muted-foreground">{call.lead.company}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Duration</div>
                            <div className="text-sm font-medium text-foreground">{formatDuration(call.duration)}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(call.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {call.transcription.length} messages
                          </div>
                        </div>

                        <div className="mt-2">
                          {getInterestBadge(call.interest_analysis)}
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                // Desktop Table View
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Call Details</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Interest</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {filteredCalls.map((call, index) => (
                        <tr key={call._id} className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-foreground">{String(call.phone_number || '—')}</div>
                              <div className="text-sm text-muted-foreground">{formatDate(call.call_date)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {call.lead ? (
                                <div>
                                  <div className="font-medium text-foreground">{call.lead.name || '—'}</div>
                                  {call.lead.company && (
                                      <div className="text-sm text-muted-foreground">{call.lead.company}</div>
                                  )}
                                </div>
                            ) : (
                                <div className="text-muted-foreground">No lead</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(call.status)}
                          </td>
                          <td className="px-6 py-4">
                            {getInterestBadge(call.interest_analysis)}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {formatDuration(call.duration)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-foreground">
                                {call.transcription.length} user messages
                              </div>
                              <div className="text-muted-foreground">
                                {call.ai_responses.length} AI responses
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                                onClick={() => setSelectedCall(call)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg transition-all"
                                title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}

            {filteredCalls.length === 0 && (
                <div className="text-center py-12">
                  <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No calls found</p>
                  <p className="text-sm text-muted-foreground">Calls will appear here after they are completed</p>
                </div>
            )}
          </div>

          {/* Call Details Modal */}
          {selectedCall && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
                  <div className="sticky top-0 bg-card border-b border-border p-4 sm:p-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Call Details</h3>
                    <button
                        onClick={() => setSelectedCall(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    {/* Call Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Phone Number</div>
                        <div className="text-foreground font-medium">{selectedCall.phone_number}</div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="text-foreground font-medium">{formatDuration(selectedCall.duration)}</div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="mt-1">{getStatusBadge(selectedCall.status)}</div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Date</div>
                        <div className="text-foreground font-medium text-sm">{formatDate(selectedCall.call_date)}</div>
                      </div>
                    </div>

                    {/* Lead Info */}
                    {selectedCall.lead && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <h4 className="text-foreground font-medium mb-3">Lead Information</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Name</div>
                              <div className="text-foreground">{selectedCall.lead.name}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Company</div>
                              <div className="text-foreground">{selectedCall.lead.company || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Email</div>
                              <div className="text-foreground break-all">{selectedCall.lead.email || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                    )}

                    {/* Interest Analysis */}
                    {selectedCall.interest_analysis && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <h4 className="text-foreground font-medium mb-4">Interest Analysis</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Interest Level</div>
                              <div className="flex items-center space-x-2">
                                {getInterestBadge(selectedCall.interest_analysis)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                              <div className="text-foreground font-medium">
                                {Math.round(selectedCall.interest_analysis.confidence * 100)}%
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Reasoning</div>
                            <p className="text-foreground text-sm">{selectedCall.interest_analysis.reasoning}</p>
                          </div>
                          {selectedCall.interest_analysis.key_indicators.length > 0 && (
                              <div className="mt-4">
                                <div className="text-sm text-muted-foreground mb-2">Key Indicators</div>
                                <div className="flex flex-wrap gap-2">
                                  {selectedCall.interest_analysis.key_indicators.map((indicator, index) => (
                                      <span
                                          key={index}
                                          className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md"
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
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-foreground font-medium mb-2">Call Summary</h4>
                      <p className="text-foreground">{selectedCall.call_summary}</p>
                    </div>

                    {/* Conversation */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-foreground font-medium mb-4">Conversation</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {[...selectedCall.transcription, ...selectedCall.ai_responses]
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                            .map((message, index) => (
                                <div key={index} className={`p-3 rounded-lg border ${
                                    message.type === 'user'
                                        ? 'bg-primary/10 border-primary/30'
                                        : 'bg-muted border-border'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      {message.type === 'user' ? (
                                          <User className="w-4 h-4 text-primary" />
                                      ) : (
                                          <MessageSquare className="w-4 h-4 text-success" />
                                      )}
                                      <span className={`text-xs font-medium ${
                                          message.type === 'user' ? 'text-primary' : 'text-success'
                                      }`}>
                                {message.type === 'user' ? 'User' : 'AI'}
                              </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                                  </div>
                                  <div className="text-foreground text-sm">{message.content}</div>
                                </div>
                            ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  )
}