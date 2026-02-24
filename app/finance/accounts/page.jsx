// =============================================================
// app/finance/accounts/page.jsx — [FIN-3] Account Manager Screen
// =============================================================
// View all financial accounts and their balances. Add new accounts.
// Accounts represent real-world bank accounts, credit cards, cash, savings.
// Route: /finance/accounts
// Ref: App_Flow [FIN-3], PRD Section 4.1, Implementation_Plan Step 4.1
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Import { useState, useEffect } from 'react'
// - Import { supabase } from '@/utils/supabase'
// - Import Card from '@/components/Card'
// - Import BottomSheet from '@/components/BottomSheet'
// - Import LoadingSkeleton from '@/components/LoadingSkeleton'
// - Import { Landmark } from 'lucide-react' (for empty state icon)

// TODO 3: STATE VARIABLES
// - accounts: array — all accounts from the accounts table
// - loading: boolean
// - showModal: boolean — controls Add Account bottom sheet
// - editingAccount: object|null — if editing, holds the account; null = add mode
// - formName: string — account name input
// - formType: string — account type ('checking' | 'credit_card' | 'cash' | 'savings')
//     Default: 'checking'
// - formStartingBalance: string — starting balance input

// TODO 4: FETCH ALL ACCOUNTS ON MOUNT
// - useEffect:
//     const { data } = await supabase
//       .from('accounts')
//       .select('*')
//       .order('created_at', { ascending: true })
//   - Set accounts state, set loading to false

// TODO 5: HEADER
// - <h1 className="text-2xl font-bold tracking-tight text-slate-50">Accounts</h1>

// TODO 6: LOADING STATE
// - <LoadingSkeleton count={3} height="h-20" />

// TODO 7: EMPTY STATE
// - If no accounts:
//     <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
//       <Landmark size={40} />
//       <p className="text-sm">No accounts yet. Add your first one!</p>
//     </div>

// TODO 8: ACCOUNTS LIST
// - Each account rendered as a Card:
//
//   8a. LEFT SIDE:
//     - Account name: text-base font-semibold text-slate-50
//     - Account type badge (under the name):
//       - Display label mapping:
//         'checking'    → "Checking"
//         'credit_card' → "Credit Card"
//         'cash'        → "Cash"
//         'savings'     → "Savings"
//       - Badge style: text-xs rounded-full px-2 py-0.5
//         - checking/cash/savings → "text-emerald-400 bg-emerald-400/10"
//         - credit_card → "text-rose-400 bg-rose-400/10"
//
//   8b. RIGHT SIDE:
//     - Current balance: "$X,XXX.XX"
//     - Color by account type:
//       - checking, cash, savings → "text-emerald-400" (green = funds available)
//       - credit_card → "text-rose-400" (red = amount owed / debt)
//
//   8c. TAP INTERACTION:
//     - Tapping an account opens edit mode (name only — balance is NEVER manually editable)
//     - Set editingAccount to the tapped account
//     - Pre-fill formName
//     - Open modal

// TODO 9: "+ ADD ACCOUNT" BUTTON
// - Full-width emerald button:
//     className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold
//                rounded-xl py-4 w-full text-base mt-6"
//     Label: "+ Add Account"
//     onClick:
//       1. Clear form (formName='', formType='checking', formStartingBalance='')
//       2. Set editingAccount = null
//       3. Set showModal = true

// TODO 10: ADD ACCOUNT MODAL (BottomSheet)
// - <BottomSheet isOpen={showModal} onClose={...}
//     title={editingAccount ? "Edit Account" : "Add Account"}>
//
// 10a. ACCOUNT NAME INPUT
//   - Label: "Account Name"
//   - type="text"
//   - placeholder="e.g., Chase Checking"
//   - Standard input classes
//
// 10b. ACCOUNT TYPE SELECTOR (segmented control — 4 options)
//   - Label: "Account Type"
//   - Options: Checking | Credit Card | Cash | Savings
//   - Active: bg-emerald-600 text-white
//   - Inactive: bg-slate-800 text-slate-400
//   - Each maps to: 'checking', 'credit_card', 'cash', 'savings'
//   - If editing: this field should be READ-ONLY (don't allow type change after creation)
//
// 10c. STARTING BALANCE INPUT (only shown in Add mode, not Edit)
//   - Label: "Starting Balance"
//   - type="text" inputMode="decimal" pattern="[0-9]*"
//   - placeholder="0.00"
//   - This is the balance at the time the account is added to the app
//   - For credit cards: enter the current amount owed
//
// 10d. SAVE BUTTON
//   className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold
//              rounded-xl py-4 w-full text-base mt-4"
//
//   If ADD mode:
//     await supabase.from('accounts').insert({
//       name: formName,
//       account_type: formType,
//       starting_balance: parseFloat(formStartingBalance),
//       balance: parseFloat(formStartingBalance),  // balance starts equal to starting_balance
//     })
//
//   If EDIT mode (name change only):
//     await supabase.from('accounts')
//       .update({ name: formName })
//       .eq('id', editingAccount.id)
//
//   After save: close modal, re-fetch accounts list

// =============================================================
// PAGE WRAPPER
// =============================================================
// - <div className="px-4 pt-6 pb-4">
//
// IMPORTANT NOTES:
// - balance = starting_balance on account creation
// - balance is ONLY updated by the database trigger on transactions
// - NEVER manually edit balance from the frontend
// - Account deletion is OUT OF SCOPE for v1
// - Editing only allows changing the account name, not type or balance
