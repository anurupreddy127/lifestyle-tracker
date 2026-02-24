'use client'

import { Dumbbell, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const isGym = pathname.startsWith('/gym')
  const isFinance = pathname.startsWith('/finance')

  return (
    <nav
      className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link
        href="/gym"
        className={`flex-1 flex flex-col items-center py-3 gap-1 ${isGym ? 'text-indigo-400' : 'text-slate-500'}`}
      >
        <Dumbbell size={22} />
        <span className="text-xs">Gym</span>
      </Link>
      <Link
        href="/finance"
        className={`flex-1 flex flex-col items-center py-3 gap-1 ${isFinance ? 'text-emerald-400' : 'text-slate-500'}`}
      >
        <Wallet size={22} />
        <span className="text-xs">Finance</span>
      </Link>
    </nav>
  )
}
