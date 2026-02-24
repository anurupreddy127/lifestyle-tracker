'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Landmark } from 'lucide-react'

const TYPE_LABELS = {
  checking: 'Checking',
  credit_card: 'Credit Card',
  cash: 'Cash',
  savings: 'Savings',
}

const TYPE_OPTIONS = ['checking', 'credit_card', 'cash', 'savings']

export default function AccountManager() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('checking')
  const [formStartingBalance, setFormStartingBalance] = useState('')

  async function fetchAccounts() {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
    setAccounts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  function openAdd() {
    setEditingAccount(null)
    setFormName('')
    setFormType('checking')
    setFormStartingBalance('')
    setShowModal(true)
  }

  function openEdit(account) {
    setEditingAccount(account)
    setFormName(account.name)
    setFormType(account.account_type)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) return

    if (editingAccount) {
      await supabase
        .from('accounts')
        .update({ name: formName.trim() })
        .eq('id', editingAccount.id)
    } else {
      const bal = parseFloat(formStartingBalance) || 0
      await supabase.from('accounts').insert({
        name: formName.trim(),
        account_type: formType,
        starting_balance: bal,
        balance: bal,
      })
    }

    setShowModal(false)
    fetchAccounts()
  }

  function formatBalance(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  function balanceColor(type) {
    return type === 'credit_card' ? 'text-rose-400' : 'text-emerald-400'
  }

  function badgeClasses(type) {
    return type === 'credit_card'
      ? 'text-rose-400 bg-rose-400/10'
      : 'text-emerald-400 bg-emerald-400/10'
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">Accounts</h1>

      {loading ? (
        <LoadingSkeleton count={3} height="h-20" />
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Landmark size={40} />
          <p className="text-sm">No accounts yet. Add your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} onClick={() => openEdit(acc)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-50">{acc.name}</h3>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${badgeClasses(acc.account_type)}`}>
                    {TYPE_LABELS[acc.account_type]}
                  </span>
                </div>
                <p className={`text-base font-semibold ${balanceColor(acc.account_type)}`}>
                  {formatBalance(acc.balance)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={openAdd}
        className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-6"
      >
        + Add Account
      </button>

      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Account Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Chase Checking"
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => !editingAccount && setFormType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    formType === t
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  } ${editingAccount ? 'opacity-50' : ''}`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {!editingAccount && (
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Starting Balance</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*"
                value={formStartingBalance}
                onChange={(e) => setFormStartingBalance(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-2"
          >
            {editingAccount ? 'Save Changes' : 'Add Account'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
