'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* User info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-2xl">person</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">{user?.email || 'User'}</p>
          <p className="text-xs text-slate-500">Lifestyle Tracker</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="divide-y divide-slate-100">
          <button
            onClick={() => router.push('/gym')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">fitness_center</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Gym Workouts</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/finance')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">account_balance_wallet</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Finance Dashboard</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/gym/stats')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">monitoring</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Stats & Analytics</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">info</span>
            <span className="flex-1 text-sm font-medium text-slate-900">Version</span>
            <span className="text-xs text-slate-400">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-white border border-rose-200 rounded-xl py-3.5 text-rose-500 font-semibold text-sm flex items-center justify-center gap-2 active:bg-rose-50"
      >
        <span className="material-symbols-outlined text-[18px]">logout</span>
        Sign Out
      </button>
    </div>
  )
}
