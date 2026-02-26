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
  const hideHeader = NO_HEADER_ROUTES.some((r) => pathname.startsWith(r))

  if (isAuthPage) {
    return (
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    )
  }

  const title = getPageTitle(pathname)

  return (
    <AuthProvider>
      <AuthGuard>
        <NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {!hideHeader && (
          <Header
            title={title}
            onMenuClick={() => setDrawerOpen(true)}
          />
        )}

        <div className="min-h-screen pb-20">
          {children}
        </div>

        <BottomNav />
      </AuthGuard>
    </AuthProvider>
  )
}
