'use client'
import { useState, useEffect } from 'react'
import { 
  Phone, Users, TrendingUp, PhoneCall, 
  CheckCircle, AlertCircle, User, Calendar,
  Settings, ArrowRight, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    leads: {
      total: 0,
      new: 0,
      called: 0,
      contacted: 0,
      converted: 0,
      total_calls: 0
    },
    calls: {
      total_calls: 0,
      calls_today: 0,
      calls_this_week: 0,
      average_duration: 0,
      inbound_calls: 0,
      outbound_calls: 0,
      completed_calls: 0,
      status_counts: { completed: 0, failed: 0, missed: 0 },
      interest_counts: { interested: 0, not_interested: 0, neutral: 0 }
    }
  })
  const [loading, setLoading] = useState(true)

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Load leads stats
      const leadsResponse = await fetch(`${process.env.NEXT_PUBLIC_LEAD_API_URL || 'https://call-agent-backend-ssrw.onrender.com'}/api/leads/stats`)
      const leadsData = await leadsResponse.json()
      
      // Load calls stats
      const callsResponse = await fetch(`${process.env.NEXT_PUBLIC_CALL_API_URL || 'https://call-agent-backend-ssrw.onrender.com'}/api/calls/stats`)
      const callsData = await callsResponse.json()
      
      setStats({
        leads: leadsData.success ? leadsData.data : stats.leads,
        calls: callsData.success ? callsData.data : stats.calls
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // DashboardPage (if it uses multiple APIs)
  console.log('📊 DASHBOARD PAGE - APIs:', {
    calls: process.env.NEXT_PUBLIC_CALL_API_URL || 'http://localhost:5004',
    leads: process.env.NEXT_PUBLIC_LEAD_API_URL || 'http://localhost:5002',
    config: process.env.NEXT_PUBLIC_CONFIG_API_URL || 'http://localhost:5001',
    conversation: process.env.NEXT_PUBLIC_CONVERSATION_API_URL || 'http://localhost:8766'
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Calling Assistant Dashboard</h1>
          <p className="text-slate-400 mt-1">Monitor your leads, calls, and conversions in real-time</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadDashboardStats}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-emerald-400 font-medium">System Active</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">{loading ? '...' : stats.leads.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-400">{stats.leads.new} new leads</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Calls</p>
              <p className="text-2xl font-bold text-white">{loading ? '...' : stats.calls.total_calls}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-400">{stats.calls.calls_today} today</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Contacted Leads</p>
              <p className="text-2xl font-bold text-white">{loading ? '...' : stats.leads.contacted}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <PhoneCall className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-400">{stats.leads.called} called total</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stats.leads.total > 0 ? `${((stats.leads.converted / stats.leads.total) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-slate-400">{stats.leads.converted} conversions</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/leads" className="group">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 hover:bg-slate-800/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Manage Leads</h3>
            <p className="text-slate-400 text-sm">Upload CSV files, view leads, and initiate calls</p>
          </div>
        </Link>

        <Link href="/calls" className="group">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 hover:bg-slate-800/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Call History</h3>
            <p className="text-slate-400 text-sm">View call logs, transcripts, and conversation analysis</p>
          </div>
        </Link>

        <Link href="/config" className="group">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 hover:bg-slate-800/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Configuration</h3>
            <p className="text-slate-400 text-sm">Configure AI prompts, greetings, and conversation flow</p>
          </div>
        </Link>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lead Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">New</span>
              </div>
              <span className="text-white font-medium">{stats.leads.new}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-300">Called</span>
              </div>
              <span className="text-white font-medium">{stats.leads.called}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-300">Contacted</span>
              </div>
              <span className="text-white font-medium">{stats.leads.contacted}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-slate-300">Converted</span>
              </div>
              <span className="text-white font-medium">{stats.leads.converted}</span>
            </div>
          </div>
        </div>

        {/* Call Performance */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Call Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Average Duration</span>
              <span className="text-white font-medium">{stats.calls.average_duration || 0}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Successful Calls</span>
              <span className="text-emerald-400 font-medium">{stats.calls.completed_calls || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Inbound Calls</span>
              <span className="text-red-400 font-medium">{stats.calls.inbound_calls || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Outbound Calls</span>
              <span className="text-white font-medium">{stats.calls.outbound_calls || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interest Analysis (if available) */}
      {stats.calls.interest_counts && (stats.calls.interest_counts.interested > 0 || stats.calls.interest_counts.not_interested > 0) && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Interest Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.calls.interest_counts.interested}</div>
              <div className="text-sm text-slate-400">Interested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-400">{stats.calls.interest_counts.neutral}</div>
              <div className="text-sm text-slate-400">Neutral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.calls.interest_counts.not_interested}</div>
              <div className="text-sm text-slate-400">Not Interested</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 