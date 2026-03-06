'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GYM_TABS = [
  { label: 'Workouts', href: '/gym', icon: 'fitness_center' },
  { label: 'Exercises', href: '/gym/library', icon: 'list_alt' },
  { label: 'Stats', href: '/gym/stats', icon: 'monitoring' },
  { label: 'Profile', href: '/profile', icon: 'person' },
]

const FINANCE_TABS = [
  { label: 'Home', href: '/finance', icon: 'home' },
  { label: 'Accounts', href: '/finance/accounts', icon: 'account_balance_wallet' },
  { label: 'Transactions', href: '/finance/transactions', icon: 'receipt_long' },
  { label: 'Profile', href: '/profile', icon: 'person' },
]

function isTabActive(pathname, href) {
  if (href === '/gym') return pathname === '/gym'
  if (href === '/finance') return pathname === '/finance'
  if (href === '/profile') return pathname === '/profile'
  return pathname.startsWith(href)
}

function getWorkspace(pathname) {
  if (pathname.startsWith('/finance')) return 'finance'
  if (pathname.startsWith('/gym')) return 'gym'
  return null
}

export default function BottomNav() {
  const pathname = usePathname()
  const workspace = getWorkspace(pathname)
  const [storedWorkspace, setStoredWorkspace] = useState(null)

  useEffect(() => {
    try { setStoredWorkspace(localStorage.getItem('lastWorkspace')) } catch {}
  }, [])

  useEffect(() => {
    if (workspace) {
      localStorage.setItem('lastWorkspace', workspace)
      setStoredWorkspace(workspace)
    }
  }, [workspace])

  const isFinance = workspace === 'finance' || (!workspace && storedWorkspace === 'finance')
  const tabs = isFinance ? FINANCE_TABS : GYM_TABS
  const activeColor = isFinance ? 'text-finance' : 'text-primary'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none" style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)` }}>
      <nav className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg shadow-black/5 flex pointer-events-auto">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                active ? activeColor : 'text-slate-400 active:text-slate-500'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] uppercase tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
