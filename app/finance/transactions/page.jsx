'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'

const CATEGORY_LABELS = { housing: 'Housing', food: 'Food', electricity: 'Electricity', health: 'Health', shopping: 'Shopping', studying: 'Studying', miscellaneous: 'Miscellaneous' }
const CATEGORY_ICONS = { housing: 'home', food: 'restaurant', electricity: 'bolt', health: 'favorite', shopping: 'shopping_bag', studying: 'school', miscellaneous: 'more_horiz' }

function groupByDate(transactions) {
  const groups = {}
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  transactions.forEach((tx) => {
    let label = tx.date
    if (tx.date === today) label = 'Today'
    else if (tx.date === yesterday) label = 'Yesterday'
    else {
      const d = new Date(tx.date + 'T00:00:00')
      label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(tx)
  })
  return Object.entries(groups)
}

export default function TransactionsPage() {
  const { supabase } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      const { data } = await supabase
        .from('transactions')
        .select('*, accounts!transactions_account_id_fkey(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)
      setTransactions(data || [])
      setLoading(false)
    }
    fetchTransactions()
  }, [])

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const grouped = groupByDate(transactions)

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={8} height="h-14" />
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <span className="material-symbols-outlined text-5xl">receipt_long</span>
          <p className="text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 pt-4 pb-2">{dateLabel}</p>
              <div className="flex flex-col gap-2">
                {items.map((tx) => (
                  <div key={tx.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">
                        {CATEGORY_ICONS[tx.category] || (tx.transaction_type === 'income' ? 'work' : tx.transaction_type === 'transfer' ? 'swap_horiz' : 'receipt')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.description || CATEGORY_LABELS[tx.category] || tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{tx.accounts?.name || ''}</p>
                    </div>
                    <p className={`text-sm font-bold ml-2 ${tx.transaction_type === 'expense' ? 'text-rose-500' : tx.transaction_type === 'income' ? 'text-finance' : 'text-slate-500'}`}>
                      {tx.transaction_type === 'expense' ? '-' : tx.transaction_type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
