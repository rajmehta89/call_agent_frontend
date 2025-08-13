'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Settings, MessageSquare, Users, Phone, BarChart3 , PhoneCall} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Configuration', href: '/config', icon: Settings },
  { name: 'Calls', href: '/calls', icon: PhoneCall },
  { name: 'Leads', href: '/leads', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="h-screen w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo Section */}
      <div className="flex items-center h-16 px-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">AI Agent</span>
            <div className="text-xs text-slate-400">Voice Assistant</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-xl">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <div>
            <div className="text-sm font-medium text-white">System Online</div>
            <div className="text-xs text-slate-400">All services running</div>
          </div>
        </div>
      </div>
    </aside>
  )
} 