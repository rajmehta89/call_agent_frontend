'use client'
import { useState, useEffect } from 'react'
import { Settings, RotateCcw, Save, MessageSquare, ArrowRight, FileText, Database } from 'lucide-react'
import toast from 'react-hot-toast'

interface AgentConfig {
  greeting_message: string
  exit_message: string
  system_prompt: string
  knowledge_base_enabled: boolean
  knowledge_base: string
}

const PROMPT_TEMPLATES = {
  'real-estate': {
    name: 'Real Estate Agent',
    prompt: 'You are a professional real estate agent. Help clients with property inquiries, scheduling viewings, and providing market information. Keep responses concise and professional.'
  },
  'customer-service': {
    name: 'Customer Service',
    prompt: 'You are a helpful customer service representative. Assist customers with inquiries, complaints, and general support. Be polite, patient, and solution-oriented.'
  },
  'sales': {
    name: 'Sales Agent',
    prompt: 'You are a skilled sales agent. Help prospects understand products/services, address objections, and guide them through the sales process. Be persuasive but not pushy.'
  },
  'appointment': {
    name: 'Appointment Booking',
    prompt: 'You are an appointment booking assistant. Help clients schedule, reschedule, or cancel appointments. Collect necessary information and confirm details.'
  },
  'generic': {
    name: 'Generic Assistant',
    prompt: 'You are a helpful AI assistant. Provide clear, concise answers to user questions. Be friendly and professional in all interactions.'
  }
}

const KNOWLEDGE_BASE_FIELDS = {
  'real-estate': [
    { key: 'company_name', label: 'Company Name', placeholder: 'Your Real Estate Company' },
    { key: 'services', label: 'Services Offered', placeholder: 'Buying, selling, renting, property management' },
    { key: 'areas', label: 'Service Areas', placeholder: 'City, neighborhoods, regions covered' },
    { key: 'contact_info', label: 'Contact Information', placeholder: 'Phone, email, office hours' }
  ],
  'customer-service': [
    { key: 'company_name', label: 'Company Name', placeholder: 'Your Company' },
    { key: 'products', label: 'Products/Services', placeholder: 'Main products or services offered' },
    { key: 'policies', label: 'Policies', placeholder: 'Return policy, warranty, shipping info' },
    { key: 'contact_info', label: 'Contact Information', placeholder: 'Support email, phone, hours' }
  ],
  'sales': [
    { key: 'company_name', label: 'Company Name', placeholder: 'Your Company' },
    { key: 'products', label: 'Products/Services', placeholder: 'What you sell' },
    { key: 'pricing', label: 'Pricing Information', placeholder: 'Price ranges, packages, discounts' },
    { key: 'benefits', label: 'Key Benefits', placeholder: 'Why choose your products/services' }
  ],
  'appointment': [
    { key: 'company_name', label: 'Company Name', placeholder: 'Your Business Name' },
    { key: 'services', label: 'Services Offered', placeholder: 'Types of appointments available' },
    { key: 'hours', label: 'Business Hours', placeholder: 'Available days and times' },
    { key: 'location', label: 'Location', placeholder: 'Address or virtual meeting info' }
  ],
  'generic': [
    { key: 'company_name', label: 'Company Name', placeholder: 'Your Company' },
    { key: 'about', label: 'About Us', placeholder: 'Brief company description' },
    { key: 'services', label: 'Services', placeholder: 'What you offer' },
    { key: 'contact', label: 'Contact Info', placeholder: 'How to reach you' }
  ]
}

const API_BASE = process.env.NEXT_CONFIG_API_URL || 'http://localhost:5001'

export default function ConfigPage() {
  const [config, setConfig] = useState<AgentConfig>({
    greeting_message: 'Hello! How can I help you today?',
    exit_message: 'Thank you for calling. Have a great day!',
    system_prompt: 'You are a helpful AI assistant. Provide clear, concise answers.',
    knowledge_base_enabled: false,
    knowledge_base: ''
  })
  const [activeTab, setActiveTab] = useState('greeting')
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('generic')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/config`)
      if (response.ok) {
        const data = await response.json()
        setConfig({
          greeting_message: data.greeting_message || '',
          exit_message: data.exit_message || '',
          system_prompt: data.system_prompt || '',
          knowledge_base_enabled: data.knowledge_base_enabled || false,
          knowledge_base: data.knowledge_base || ''
        })
      }
    } catch (error) {
      console.error('Error loading config:', error)
      toast.error('Failed to load configuration')
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        toast.success('Configuration saved successfully!')
      } else {
        toast.error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const resetConfig = () => {
    setConfig({
      greeting_message: 'Hello! How can I help you today?',
      exit_message: 'Thank you for calling. Have a great day!',
      system_prompt: 'You are a helpful AI assistant. Provide clear, concise answers.',
      knowledge_base_enabled: false,
      knowledge_base: ''
    })
    toast.success('Configuration reset to defaults')
  }

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template)
    const templateData = PROMPT_TEMPLATES[template as keyof typeof PROMPT_TEMPLATES]
    setConfig(prev => ({
      ...prev,
      system_prompt: templateData.prompt
    }))
  }

  const handleKnowledgeBaseToggle = () => {
    setConfig(prev => ({
      ...prev,
      knowledge_base_enabled: !prev.knowledge_base_enabled
    }))
  }

  const handleKnowledgeBaseFieldChange = (field: string, value: string) => {
    try {
      const currentKB = config.knowledge_base ? JSON.parse(config.knowledge_base) : {}
      const updatedKB = { ...currentKB, [field]: value }
      setConfig(prev => ({
        ...prev,
        knowledge_base: JSON.stringify(updatedKB, null, 2)
      }))
    } catch (error) {
      console.error('Error updating knowledge base:', error)
    }
  }

  const renderKnowledgeBaseField = (field: any) => {
    let currentValue = ''
    try {
      const kb = config.knowledge_base ? JSON.parse(config.knowledge_base) : {}
      currentValue = kb[field.key] || ''
    } catch (error) {
      currentValue = ''
    }

    return (
      <div key={field.key} className="space-y-2">
        <label className="block text-sm font-medium text-slate-200">
          {field.label}
        </label>
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleKnowledgeBaseFieldChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>
    )
  }

  const tabs = [
    { id: 'greeting', name: 'Greeting', icon: MessageSquare },
    { id: 'exit', name: 'Exit', icon: ArrowRight },
    { id: 'behavior', name: 'Agent Behavior', icon: FileText },
    { id: 'knowledge', name: 'Knowledge Base', icon: Database }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Configuration</h1>
          <p className="text-slate-400 mt-1">Customize your AI agent's behavior and responses</p>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'greeting' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Greeting Message</h3>
                <p className="text-slate-400 mb-4">This message will be played when a call starts</p>
                <textarea
                  value={config.greeting_message || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter your greeting message..."
                />
                <p className="text-sm text-slate-500 mt-2">Character count: {(config.greeting_message || '').length}</p>
              </div>
            </div>
          )}

          {activeTab === 'exit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Exit Message</h3>
                <p className="text-slate-400 mb-4">This message will be played when a call ends</p>
                <textarea
                  value={config.exit_message || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, exit_message: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter your exit message..."
                />
                <p className="text-sm text-slate-500 mt-2">Character count: {(config.exit_message || '').length}</p>
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">System Prompt Template</h3>
                <p className="text-slate-400 mb-4">Choose a template or customize your system prompt</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => handleTemplateChange(key)}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-left
                        ${selectedTemplate === key
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                        }
                      `}
                    >
                      <div className="font-medium text-white mb-1">{template.name}</div>
                      <div className="text-sm text-slate-400">{template.prompt.substring(0, 80)}...</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Custom System Prompt
                  </label>
                  <textarea
                    value={config.system_prompt || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter your custom system prompt..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Knowledge Base</h3>
                  <p className="text-slate-400">Enable and configure custom knowledge for your agent</p>
                </div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.knowledge_base_enabled || false}
                    onChange={handleKnowledgeBaseToggle}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-slate-200">Enable Knowledge Base</span>
                </label>
              </div>

              {config.knowledge_base_enabled && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {KNOWLEDGE_BASE_FIELDS[selectedTemplate as keyof typeof KNOWLEDGE_BASE_FIELDS]?.map(renderKnowledgeBaseField)}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Raw Knowledge Base (JSON)
                    </label>
                    <textarea
                      value={config.knowledge_base || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, knowledge_base: e.target.value }))}
                      rows={8}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={resetConfig}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>

        <button
          onClick={saveConfig}
          disabled={loading}
          className="flex items-center space-x-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* How it works */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How it works</h3>
        <div className="space-y-3 text-slate-400">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Greeting messages are played when calls start to welcome callers</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Exit messages are played when calls end to provide closure</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>System prompts define your agent's personality and behavior</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Knowledge base provides specific information for your agent to reference</p>
          </div>
        </div>
      </div>
    </div>
  )
} 