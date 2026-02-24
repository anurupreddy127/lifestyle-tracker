'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import BottomSheet from '@/components/BottomSheet'
import Toast from '@/components/Toast'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Landmark, Bell, Plus } from 'lucide-react'

const CATEGORIES = [
  'housing', 'food', 'electricity', 'health', 'shopping', 'studying', 'miscellaneous',
]

const CATEGORY_LABELS = {
  housing: 'Housing',
  food: 'Food',
  electricity: 'Electricity',
  health: 'Health',
  shopping: 'Shopping',
  studying: 'Studying',
  miscellaneous: 'Miscellaneous',
}

export default function FinanceDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')

  // Transaction form state
  const [txType, setTxType] = useState('expense')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0])
  const [txAmount, setTxAmount] = useState('')
  const [txAccountId, setTxAccountId] = useState('')
  const [txToAccountId, setTxToAccountId] = useState('')
  const [txCategory, setTxCategory] = useState('food')
  const [txDescription, setTxDescription] = useState('')

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  async function fetchData() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    const [accountsRes, txRes, incomeRes, expenseRes] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase
        .from('transactions')
        .select('*, accounts!transactions_account_id_fkey(name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'income')
        .gte('date', startOfMonth)
        .lte('date', today),
      supabase
        .from('transactions')
        .select('amount')
        .eq('transaction_type', 'expense')
        .gte('date', startOfMonth)
        .lte('date', today),
    ])

    setAccounts(accountsRes.data || [])
    setTransactions(txRes.data || [])

    const incTotal = (incomeRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
    const expTotal = (expenseRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
    setTotalIncome(incTotal)
    setTotalExpenses(expTotal)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function openAddTransaction() {
    setTxType('expense')
    setTxDate(new Date().toISOString().split('T')[0])
    setTxAmount('')
    setTxAccountId(accounts[0]?.id || '')
    setTxToAccountId('')
    setTxCategory('food')
    setTxDescription('')
    setShowModal(true)
  }

  async function handleSaveTransaction() {
    const amount = parseFloat(txAmount)
    if (!amount || amount <= 0) return
    if (!txAccountId) return
    if (txType === 'transfer' && !txToAccountId) return
    if (txType === 'transfer' && txAccountId === txToAccountId) return

    const row = {
      transaction_type: txType,
      amount,
      date: txDate,
      account_id: txAccountId,
      to_account_id: txType === 'transfer' ? txToAccountId : null,
      category: txType === 'expense' ? txCategory : null,
      description: txDescription.trim() || null,
    }

    await supabase.from('transactions').insert(row)
    setShowModal(false)
    setToast('Transaction saved!')
    fetchData()
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function txColor(type) {
    if (type === 'income') return 'text-emerald-400'
    if (type === 'expense') return 'text-rose-400'
    return 'text-slate-300'
  }

  const net = totalIncome - totalExpenses

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">Finance</h1>
          <p className="text-sm text-slate-400">{currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/finance/accounts')}
            className="text-slate-400 active:text-emerald-400 p-2"
          >
            <Landmark size={22} />
          </button>
          <button
            onClick={() => router.push('/finance/subscriptions')}
            className="text-slate-400 active:text-emerald-400 p-2"
          >
            <Bell size={22} />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={6} height="h-16" />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Income</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Expenses</p>
              <p className="text-lg font-bold text-rose-400">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Net</p>
              <p className={`text-lg font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(net)}
              </p>
            </div>
          </div>

          {/* Account Balances */}
          <h2 className="text-lg font-semibold text-slate-50 mb-3">Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500 mb-6">No accounts yet. Add one from the accounts page.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-50">{acc.name}</p>
                    <p className="text-xs text-slate-500">
                      {acc.account_type === 'credit_card' ? 'Credit Card' : acc.account_type.charAt(0).toUpperCase() + acc.account_type.slice(1)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${acc.account_type === 'credit_card' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          <h2 className="text-lg font-semibold text-slate-50 mb-3">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-50 truncate">
                        {tx.description || CATEGORY_LABELS[tx.category] || tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500 truncate">{tx.accounts?.name || ''}</span>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ml-3 ${txColor(tx.transaction_type)}`}>
                    {tx.transaction_type === 'expense' ? '-' : tx.transaction_type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={openAddTransaction}
        className="fixed bottom-24 right-5 w-14 h-14 bg-emerald-600 active:bg-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/50"
      >
        <Plus size={28} className="text-white" />
      </button>

      {/* Add Transaction Modal */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Transaction"
      >
        <div className="flex flex-col gap-4">
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {['expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => setTxType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  txType === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Date</label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="$ 0.00"
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          {/* Account */}
          <div>
            <label className="text-sm text-slate-300 mb-1 block">
              {txType === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              value={txAccountId}
              onChange={(e) => setTxAccountId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* To Account (transfer only) */}
          {txType === 'transfer' && (
            <div>
              <label className="text-sm text-slate-300 mb-1 block">To Account</label>
              <select
                value={txToAccountId}
                onChange={(e) => setTxToAccountId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
              >
                <option value="">Select account</option>
                {accounts.filter((a) => a.id !== txAccountId).map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category (expense only) */}
          {txType === 'expense' && (
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Category</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Description (optional)</label>
            <input
              type="text"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="e.g., Groceries at Costco"
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <button
            onClick={handleSaveTransaction}
            className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-2"
          >
            Save Transaction
          </button>
        </div>
      </BottomSheet>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
