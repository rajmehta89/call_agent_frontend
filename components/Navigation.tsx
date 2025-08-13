'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, Phone, PhoneCall } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()
  
  const navItems = [
    {
      href: '/config',
      label: 'Configuration',
      icon: Settings,
      description: 'Agent Settings'
    },
    {
      href: '/leads',
      label: 'Leads',
      icon: Users,
      description: 'Manage Leads'
    },
    {
      href: '/calls',
      label: 'Call History',
      icon: PhoneCall,
      description: 'View Call Details'
    }
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Phone className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Agent Dashboard</h1>
              <p className="text-sm text-gray-600">Intelligent Call Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
} 