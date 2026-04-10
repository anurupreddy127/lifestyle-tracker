'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import NavigationDrawer from '@/components/NavigationDrawer'

const AUTH_ROUTES = ['/login', '/signup']

// Pages where Header is hidden (they render their own header)
const NO_HEADER_ROUTES = ['/gym/workout']

function getOrdinal(day) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = day % 100
  return day + (s[(v - 20) % 10] || s[v] || s[0])
}

function getFormattedDate() {
  const now = new Date()
  const day = now.getDate()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()
  return `${getOrdinal(day)} ${month} ${year}`
}

// Route → title mapping
function getPageTitle(pathname) {
  if (pathname === '/gym') return 'My Workouts'
  if (pathname === '/gym/library') return 'Exercise Library'
  if (pathname === '/gym/stats') return 'Gym Stats'
  if (pathname === '/gym/builder') return 'Build Day'
  if (pathname.startsWith('/gym/builder/')) return 'Edit Day'
  if (pathname === '/finance') return 'Finance'
  if (pathname === '/finance/accounts') return 'Accounts'
  if (pathname === '/finance/transactions') return 'Transactions'
  if (pathname === '/finance/subscriptions') return 'Subscriptions'
  if (pathname === '/profile') return 'Profile'
  return 'Lifestyle Tracker'
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isAuthPage = AUTH_ROUTES.includes(pathname)
  const isHubPage = pathname === '/'
  const hideHeader = NO_HEADER_ROUTES.some((r) => pathname.startsWith(r))

  if (isAuthPage) {
    return (
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    )
  }

  if (isHubPage) {
    return (
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    )
  }

  const title = getPageTitle(pathname)
  const isFinancePage = pathname.startsWith('/finance')
  const subtitle = isFinancePage ? getFormattedDate() : undefined

  return (
    <AuthProvider>
      <AuthGuard>
        <NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {!hideHeader && (
          <Header
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setDrawerOpen(true)}
          />
        )}

        <div
          className="min-h-screen"
          style={{
            paddingTop: hideHeader ? undefined : 'calc(3.5rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </div>

        <BottomNav />
      </AuthGuard>
    </AuthProvider>
  )
}
