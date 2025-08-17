'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, Phone, PhoneCall, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">AI Agent Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Intelligent Call Management</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex space-x-1">
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

            {/* Mobile Menu Button */}
            <button
                onClick={toggleMobileMenu}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                    flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors w-full
                    ${isActive
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                  `}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
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