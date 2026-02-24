// =============================================================
// app/finance/subscriptions/page.jsx — [FIN-4] Subscription Reminders
// =============================================================
// Displays recurring bill reminders. These are DISPLAY ONLY — they do NOT
// auto-create transactions. User reads these and logs expenses manually.
// Route: /finance/subscriptions
// Ref: App_Flow [FIN-4], PRD Section 4.6, Implementation_Plan Step 4.4
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Import { useState, useEffect } from 'react'
// - Import { supabase } from '@/utils/supabase'
// - Import Card from '@/components/Card'
// - Import BottomSheet from '@/components/BottomSheet'
// - Import LoadingSkeleton from '@/components/LoadingSkeleton'
// - Import { Bell } from 'lucide-react' (for empty state icon)

// TODO 3: STATE VARIABLES
// - reminders: array — all subscription reminders
// - accounts: array — all accounts (for the account dropdown in the form)
// - loading: boolean
// - showModal: boolean — controls Add/Edit Subscription bottom sheet
// - editingReminder: object|null — if editing, holds the reminder; null = add mode
//
// Form state:
// - formName: string — subscription name (e.g., "Netflix")
// - formAmount: string — expected charge amount
// - formBillingType: string — 'monthly' or 'yearly' (default: 'monthly')
// - formNextDate: string — next billing date
// - formAccountId: string — which account it usually charges to
// - formCategory: string — expense category for reference

// TODO 4: FETCH DATA ON MOUNT
// - Fetch reminders:
//     const { data: remindersData } = await supabase
//       .from('subscription_reminders')
//       .select('*, accounts(name)')
//       .order('next_billing_date', { ascending: true })
//   - Sorted by next_billing_date ascending (soonest due first)
//
// - Fetch accounts (for the dropdown in the form):
//     const { data: accountsData } = await supabase
//       .from('accounts')
//       .select('id, name')
//       .order('created_at', { ascending: true })

// TODO 5: HEADER
// - <h1 className="text-2xl font-bold tracking-tight text-slate-50">Subscriptions</h1>

// TODO 6: LOADING STATE
// - <LoadingSkeleton count={4} height="h-20" />

// TODO 7: EMPTY STATE
// - If no reminders:
//     <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
//       <Bell size={40} />
//       <p className="text-sm">No subscription reminders yet.</p>
//     </div>

// TODO 8: REMINDERS LIST
// - Each reminder rendered as a Card:
//
//   8a. PAST-DUE HIGHLIGHTING:
//     - If next_billing_date <= today:
//         Add "border-amber-500" to the card (orange border = overdue / due today)
//     - Otherwise: default "border-slate-800"
//
//   8b. CARD CONTENT:
//     - Top row (flex, space-between):
//       - Left: Subscription name (text-base font-semibold text-slate-50)
//       - Right: Amount "$XX.XX" (text-base font-semibold text-slate-50)
//
//     - Bottom row (flex, space-between):
//       - Left: Next due date "Due: Jul 15" (text-xs text-slate-400)
//               If past due, show in "text-amber-500" instead
//       - Center: Account name (text-xs text-slate-500)
//       - Right: Category badge (text-xs text-slate-500)
//
//     - Billing type indicator: "Monthly" or "Yearly"
//       (small badge: text-xs text-slate-500)
//
//   8c. INTERACTIONS:
//     - Tap card → open Edit mode (pre-fill all form fields)
//     - Swipe left → show Delete option
//       - On confirm delete:
//           await supabase.from('subscription_reminders').delete().eq('id', reminder.id)
//           Re-fetch reminders list

// TODO 9: "+ ADD SUBSCRIPTION" BUTTON
// - Full-width emerald button:
//     className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold
//                rounded-xl py-4 w-full text-base mt-6"
//     Label: "+ Add Subscription"
//     onClick:
//       1. Clear all form fields
//       2. Set editingReminder = null
//       3. Set showModal = true

// TODO 10: ADD / EDIT SUBSCRIPTION MODAL (BottomSheet)
// - <BottomSheet isOpen={showModal} onClose={...}
//     title={editingReminder ? "Edit Subscription" : "Add Subscription"}>
//
// 10a. NAME INPUT
//   - Label: "Subscription Name"
//   - placeholder="e.g., Netflix"
//
// 10b. AMOUNT INPUT
//   - Label: "Amount"
//   - type="text" inputMode="decimal" pattern="[0-9]*"
//   - placeholder="0.00"
//
// 10c. BILLING TYPE TOGGLE (segmented control)
//   - Two options: "Monthly" | "Yearly"
//   - Maps to: 'monthly' | 'yearly'
//   - Active: bg-emerald-600 text-white
//   - Inactive: bg-slate-800 text-slate-400
//
// 10d. NEXT BILLING DATE
//   - Label: "Next Billing Date"
//   - type="date" input
//   - The user manually updates this after each payment
//
// 10e. ACCOUNT DROPDOWN
//   - Label: "Account"
//   - <select> populated from accounts state
//   - Which account this subscription usually charges to
//
// 10f. CATEGORY DROPDOWN
//   - Label: "Category"
//   - Options (same 7 fixed categories):
//     Housing, Food, Electricity, Health, Shopping, Studying, Miscellaneous
//   - Used as reference when the user manually logs the expense
//
// 10g. SAVE BUTTON
//   className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold
//              rounded-xl py-4 w-full text-base mt-4"
//
//   VALIDATION:
//   - Name, amount, next date, account, and category are ALL required
//
//   If ADD mode:
//     await supabase.from('subscription_reminders').insert({
//       name: formName,
//       amount: parseFloat(formAmount),
//       billing_type: formBillingType,
//       next_billing_date: formNextDate,
//       account_id: formAccountId,
//       category: formCategory,
//     })
//
//   If EDIT mode:
//     await supabase.from('subscription_reminders').update({
//       name: formName,
//       amount: parseFloat(formAmount),
//       billing_type: formBillingType,
//       next_billing_date: formNextDate,
//       account_id: formAccountId,
//       category: formCategory,
//     }).eq('id', editingReminder.id)
//
//   After save: close modal, re-fetch reminders list

// =============================================================
// PAGE WRAPPER
// =============================================================
// - <div className="px-4 pt-6 pb-4">
//
// IMPORTANT NOTES:
// - Subscriptions are REMINDERS ONLY — they do NOT auto-create transactions
// - There is NO automation (no cron, no pg_cron, no edge functions)
// - Workflow: User sees reminder → opens Add Transaction on dashboard →
//   logs it as an Expense → comes back and updates next_billing_date
// - Past-due reminders (next_billing_date <= today) get amber/orange border
// - Valid categories: housing, food, electricity, health, shopping, studying, miscellaneous
