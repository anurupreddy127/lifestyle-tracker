'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const GYM_LINKS = [
  { label: 'My Workouts', href: '/gym', icon: 'fitness_center' },
  { label: 'Exercise Library', href: '/gym/library', icon: 'list_alt' },
  { label: 'Stats', href: '/gym/stats', icon: 'monitoring' },
]

const FINANCE_LINKS = [
  { label: 'Dashboard', href: '/finance', icon: 'home' },
  { label: 'Accounts', href: '/finance/accounts', icon: 'account_balance_wallet' },
  { label: 'Transactions', href: '/finance/transactions', icon: 'receipt_long' },
  { label: 'People', href: '/finance/people', icon: 'people' },
  { label: 'Subscriptions', href: '/finance/subscriptions', icon: 'subscriptions' },
]

function getWorkspace(pathname) {
  if (pathname.startsWith('/finance')) return 'finance'
  if (pathname.startsWith('/gym')) return 'gym'
  return null
}

export default function NavigationDrawer({ isOpen, onClose }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const workspace = getWorkspace(pathname)
  let storedWs = null
  try { storedWs = localStorage.getItem('lastWorkspace') } catch {}
  const isFinance = workspace === 'finance' || (!workspace && storedWs === 'finance')
  const navLinks = isFinance ? FINANCE_LINKS : GYM_LINKS

  const handleSignOut = async () => {
    onClose()
    await signOut()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-[280px] bg-dark-nav z-[60] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* User section */}
        <div className="p-5 pb-4">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-white text-xl">person</span>
          </div>
          <p className="font-bold text-dark-text text-sm">{user?.email || 'User'}</p>
          <p className="text-xs text-dark-muted mt-0.5">Lifestyle Tracker</p>
        </div>

        <div className="border-b border-dark-border mx-3" />

        {/* Workspace switcher */}
        <div className="p-3">
          <p className="text-[10px] font-bold text-dark-muted uppercase tracking-widest px-3 mb-2">Workspace</p>
          <Link
            href="/gym"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              !isFinance ? 'bg-primary/15 text-primary font-semibold' : 'text-dark-muted hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">fitness_center</span>
            Gym
          </Link>
          <Link
            href="/finance"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isFinance ? 'bg-finance/15 text-finance font-semibold' : 'text-dark-muted hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            Finance
          </Link>
        </div>

        <div className="border-b border-dark-border mx-3" />

        {/* Navigation links */}
        <div className="p-3 flex-1">
          <p className="text-[10px] font-bold text-dark-muted uppercase tracking-widest px-3 mb-2">Navigation</p>
          {navLinks.map((link) => {
            const active = pathname === link.href
            const color = isFinance ? 'text-finance' : 'text-primary'
            const bg = isFinance ? 'bg-finance/15' : 'bg-primary/15'
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? `${bg} ${color} font-semibold` : 'text-dark-muted hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="border-b border-dark-border mx-3" />

        {/* Bottom section */}
        <div className="p-3">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-muted hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 w-full cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
