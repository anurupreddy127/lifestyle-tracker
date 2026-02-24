'use client'

import { Wallet } from 'lucide-react'

export default function FinanceDashboard() {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">Finance</h1>
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Wallet size={40} />
        <p className="text-sm">Finance Dashboard — coming soon</p>
      </div>
    </div>
  )
}
