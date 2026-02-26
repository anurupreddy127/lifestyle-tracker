'use client'

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

export default function BottomNav() {
  const pathname = usePathname()
  const isFinance = pathname.startsWith('/finance')
  const tabs = isFinance ? FINANCE_TABS : GYM_TABS
  const activeColor = isFinance ? 'text-finance' : 'text-primary'

  return (
    <nav
      className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 ${
              active ? activeColor : 'text-slate-400'
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
  )
}
