'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Bell, Trash2 } from 'lucide-react'

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

export default function SubscriptionReminders() {
  const [reminders, setReminders] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formBillingType, setFormBillingType] = useState('monthly')
  const [formNextDate, setFormNextDate] = useState('')
  const [formAccountId, setFormAccountId] = useState('')
  const [formCategory, setFormCategory] = useState('miscellaneous')

  async function fetchData() {
    const [remindersRes, accountsRes] = await Promise.all([
      supabase
        .from('subscription_reminders')
        .select('*, accounts(name)')
        .order('next_billing_date', { ascending: true }),
      supabase
        .from('accounts')
        .select('id, name')
        .order('created_at', { ascending: true }),
    ])
    setReminders(remindersRes.data || [])
    setAccounts(accountsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function openAdd() {
    setEditingReminder(null)
    setFormName('')
    setFormAmount('')
    setFormBillingType('monthly')
    setFormNextDate('')
    setFormAccountId(accounts[0]?.id || '')
    setFormCategory('miscellaneous')
    setShowModal(true)
  }

  function openEdit(reminder) {
    setEditingReminder(reminder)
    setFormName(reminder.name)
    setFormAmount(String(reminder.amount))
    setFormBillingType(reminder.billing_type)
    setFormNextDate(reminder.next_billing_date)
    setFormAccountId(reminder.account_id)
    setFormCategory(reminder.category)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim() || !formAmount || !formNextDate || !formAccountId || !formCategory) return

    const row = {
      name: formName.trim(),
      amount: parseFloat(formAmount),
      billing_type: formBillingType,
      next_billing_date: formNextDate,
      account_id: formAccountId,
      category: formCategory,
    }

    if (editingReminder) {
      await supabase.from('subscription_reminders').update(row).eq('id', editingReminder.id)
    } else {
      await supabase.from('subscription_reminders').insert(row)
    }

    setShowModal(false)
    fetchData()
  }

  async function handleDelete(id) {
    await supabase.from('subscription_reminders').delete().eq('id', id)
    fetchData()
  }

  function isPastDue(dateStr) {
    const today = new Date().toISOString().split('T')[0]
    return dateStr <= today
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">Subscriptions</h1>

      {loading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Bell size={40} />
          <p className="text-sm">No subscription reminders yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((rem) => {
            const pastDue = isPastDue(rem.next_billing_date)
            return (
              <div
                key={rem.id}
                className={`bg-slate-900 rounded-xl p-4 border ${pastDue ? 'border-amber-500' : 'border-slate-800'}`}
              >
                <div className="flex items-start justify-between" onClick={() => openEdit(rem)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-slate-50">{rem.name}</h3>
                      <p className="text-base font-semibold text-slate-50">{formatCurrency(rem.amount)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${pastDue ? 'text-amber-500' : 'text-slate-400'}`}>
                        Due: {formatDate(rem.next_billing_date)}
                      </span>
                      <span className="text-xs text-slate-500">{rem.accounts?.name}</span>
                      <span className="text-xs text-slate-500">{CATEGORY_LABELS[rem.category]}</span>
                    </div>
                    <span className="text-xs text-slate-600 mt-1 inline-block">
                      {rem.billing_type === 'monthly' ? 'Monthly' : 'Yearly'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(rem.id)
                    }}
                    className="text-slate-600 active:text-rose-400 p-2 ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={openAdd}
        className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-6"
      >
        + Add Subscription
      </button>

      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingReminder ? 'Edit Subscription' : 'Add Subscription'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Subscription Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Netflix"
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Billing Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['monthly', 'yearly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFormBillingType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    formBillingType === t
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Next Billing Date</label>
            <input
              type="date"
              value={formNextDate}
              onChange={(e) => setFormNextDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Account</label>
            <select
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-emerald-500 w-full"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-2"
          >
            {editingReminder ? 'Save Changes' : 'Add Subscription'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
