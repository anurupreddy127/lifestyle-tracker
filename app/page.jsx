'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Lifestyle Tracker
        </h1>
        <p className="text-sm text-slate-400 mt-1">Choose your workspace</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        {/* Gym Card */}
        <Link
          href="/gym"
          className="flex items-center gap-5 rounded-2xl p-6 shadow-lg shadow-primary/15 active:scale-[0.98] transition-transform cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 106, 244, 0.85), rgba(37, 106, 244, 0.65))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-white text-[36px]">
              fitness_center
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Gym</h2>
            <p className="text-sm text-white/70 mt-0.5">Workouts, exercises & stats</p>
          </div>
          <span className="material-symbols-outlined text-white/50 ml-auto text-[24px]">
            chevron_right
          </span>
        </Link>

        {/* Finance Card */}
        <Link
          href="/finance"
          className="flex items-center gap-5 rounded-2xl p-6 shadow-lg shadow-finance/15 active:scale-[0.98] transition-transform cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.85), rgba(16, 185, 129, 0.65))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-white text-[36px]">
              account_balance_wallet
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Finance</h2>
            <p className="text-sm text-white/70 mt-0.5">Accounts, transactions & budgets</p>
          </div>
          <span className="material-symbols-outlined text-white/50 ml-auto text-[24px]">
            chevron_right
          </span>
        </Link>
      </div>
    </div>
  )
}
