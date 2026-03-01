'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
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
          className="flex items-center gap-5 bg-primary rounded-2xl p-6 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
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
          className="flex items-center gap-5 bg-finance rounded-2xl p-6 shadow-lg shadow-finance/20 active:scale-[0.98] transition-transform"
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
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
