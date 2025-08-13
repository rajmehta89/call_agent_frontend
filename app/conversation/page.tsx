'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Wifi, WifiOff, Trash2, Activity, Phone, Users, TrendingUp } from 'lucide-react'

interface Message {
  id: number
  type: 'user' | 'bot'
  content: string
  timestamp: string
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [stats, setStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    botMessages: 0
  })
  const wsRef = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 5

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout
    let isUnmounted = false

    const connectWebSocket = () => {
      if (isConnecting || wsRef.current?.readyState === WebSocket.OPEN || isUnmounted) {
        return
      }

      setIsConnecting(true)
      
      if (wsRef.current) {
        wsRef.current.close()
      }

      const ws = new WebSocket(process.env.NEXT_PUBLIC_CONVERSATION_API_URL || 'ws://localhost:8766')
      wsRef.current = ws

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          setIsConnected(false)
          setIsConnecting(false)
          console.error('WebSocket connection timeout')
        }
      }, 5000)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setIsConnecting(false)
        retryCount.current = 0
        clearTimeout(connectionTimeout)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setIsConnecting(false)
        clearTimeout(connectionTimeout)

        if (retryCount.current < maxRetries && !isUnmounted) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000)
          reconnectTimeout = setTimeout(() => {
            if (!isUnmounted) {
              retryCount.current++
              connectWebSocket()
            }
          }, delay)
        } else if (retryCount.current >= maxRetries) {
          console.error('Max retry attempts reached')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setIsConnecting(false)
        clearTimeout(connectionTimeout)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received message:', data)

          // Check for duplicates
          const isDuplicate = messages.some(msg => 
            msg.type === data.type && 
            msg.content === data.content &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 1000
          )

          if (!isDuplicate) {
            setMessages(prev => {
              const newMessages = [...prev, data]
              // Keep only last 100 messages
              return newMessages.slice(-100)
            })

            // Update stats
            setStats(prev => ({
              totalMessages: prev.totalMessages + 1,
              userMessages: prev.userMessages + (data.type === 'user' ? 1 : 0),
              botMessages: prev.botMessages + (data.type === 'bot' ? 1 : 0)
            }))
          } else {
            console.log('Skipped duplicate message:', data)
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }
    }

    connectWebSocket()

    return () => {
      isUnmounted = true
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearTimeout(reconnectTimeout)
    }
  }, [])

  const clearMessages = () => {
    setMessages([])
    setStats({
      totalMessages: 0,
      userMessages: 0,
      botMessages: 0
    })
  }

  const formatTime = (timestamp: string) => {
    try {
      // Handle different timestamp formats
      let date: Date
      
      if (timestamp.includes('T')) {
        // ISO format: "2023-08-07T16:30:26.123456"
        date = new Date(timestamp)
      } else if (timestamp.includes('-')) {
        // Date format: "2023-08-07 16:30:26"
        date = new Date(timestamp.replace(' ', 'T'))
      } else {
        // Unix timestamp or other format
        date = new Date(timestamp)
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp)
        return 'Invalid Date'
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error)
      return 'Invalid Date'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Conversation Monitor</h1>
          <p className="text-slate-400 mt-1">Real-time conversation monitoring and logging</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
        </div>

        <button
          onClick={clearMessages}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Log</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Messages</p>
              <p className="text-2xl font-bold text-white">{stats.totalMessages}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">User Messages</p>
              <p className="text-2xl font-bold text-white">{stats.userMessages}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Bot Responses</p>
              <p className="text-2xl font-bold text-white">{stats.botMessages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Log */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Conversation Log</h3>
          <p className="text-slate-400 text-sm">Real-time conversation messages</p>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No messages yet. Start a conversation to see messages here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`p-4 rounded-xl border ${
                    message.type === 'user' 
                      ? 'bg-blue-600/10 border-blue-500/20' 
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        message.type === 'user' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        message.type === 'user' ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {message.type === 'user' ? 'User' : 'Bot'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 