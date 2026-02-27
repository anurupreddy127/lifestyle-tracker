"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { adjustBalance } from "@/lib/balanceUtils";

const CATEGORIES = [
  "housing",
  "food",
  "electricity",
  "health",
  "shopping",
  "studying",
  "miscellaneous",
];
const CATEGORY_LABELS = {
  housing: "Housing",
  food: "Food",
  electricity: "Electricity",
  health: "Health",
  shopping: "Shopping",
  studying: "Studying",
  miscellaneous: "Miscellaneous",
};
const CATEGORY_ICONS = {
  housing: "home",
  food: "restaurant",
  electricity: "bolt",
  health: "favorite",
  shopping: "shopping_bag",
  studying: "school",
  miscellaneous: "more_horiz",
};
const CATEGORY_COLORS = {
  housing: "bg-blue-100 text-blue-600",
  food: "bg-orange-100 text-orange-600",
  electricity: "bg-yellow-100 text-yellow-600",
  health: "bg-rose-100 text-rose-600",
  shopping: "bg-purple-100 text-purple-600",
  studying: "bg-indigo-100 text-indigo-600",
  miscellaneous: "bg-slate-100 text-slate-600",
};

function groupByDate(transactions) {
  const groups = {};
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  transactions.forEach((tx) => {
    let label = tx.date;
    if (tx.date === today) label = "Today";
    else if (tx.date === yesterday) label = "Yesterday";
    else {
      const d = new Date(tx.date + "T00:00:00");
      label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return Object.entries(groups);
}

export default function TransactionsPage() {
  const { supabase, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [categorySpending, setCategorySpending] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  // Transaction form
  const [txType, setTxType] = useState("expense");
  const [txDate, setTxDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [txAmount, setTxAmount] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txToAccountId, setTxToAccountId] = useState("");
  const [txCategory, setTxCategory] = useState("food");
  const [txDescription, setTxDescription] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Subscription quick-pay
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subFormName, setSubFormName] = useState("");
  const [subFormAmount, setSubFormAmount] = useState("");
  const [subFormBillingType, setSubFormBillingType] = useState("monthly");
  const [subFormNextDate, setSubFormNextDate] = useState("");
  const [subFormAccountId, setSubFormAccountId] = useState("");
  const [subFormCategory, setSubFormCategory] = useState("miscellaneous");

  async function fetchData() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const today = now.toISOString().split("T")[0];

      const [txRes, accountsRes, subsRes, expenseCatRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, accounts!transactions_account_id_fkey(name)")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("accounts")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("subscription_reminders")
          .select("*, accounts(name)")
          .order("next_billing_date", { ascending: true }),
        supabase
          .from("transactions")
          .select("amount, category")
          .eq("transaction_type", "expense")
          .gte("date", startOfMonth)
          .lte("date", today),
      ]);
      setTransactions(txRes.data || []);
      setAccounts(accountsRes.data || []);
      setSubscriptions(subsRes.data || []);

      const byCat = {};
      (expenseCatRes.data || []).forEach((r) => {
        if (r.category) byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount);
      });
      setCategorySpending(byCat);

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditingTransaction(null);
    setTxType("expense");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxAmount("");
    setTxAccountId(accounts[0]?.id || "");
    setTxToAccountId("");
    setTxCategory("food");
    setTxDescription("");
    setShowDeleteConfirm(false);
    setSelectedSubscription(null);
    setShowSubForm(false);
    setSubFormName("");
    setSubFormAmount("");
    setSubFormBillingType("monthly");
    setSubFormNextDate("");
    setSubFormAccountId(accounts[0]?.id || "");
    setSubFormCategory("miscellaneous");
    setShowModal(true);
  }

  function openEdit(tx) {
    setEditingTransaction(tx);
    setTxType(tx.transaction_type);
    setTxDate(tx.date);
    setTxAmount(String(tx.amount));
    setTxAccountId(tx.account_id);
    setTxToAccountId(tx.to_account_id || "");
    setTxCategory(tx.category || "food");
    setTxDescription(tx.description || "");
    setShowDeleteConfirm(false);
    setSelectedSubscription(null);
    setShowSubForm(false);
    setShowModal(true);
  }

  async function handleSave() {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) return;
    if (!txAccountId) return;
    if (txType === "transfer" && !txToAccountId) return;
    if (txType === "transfer" && txAccountId === txToAccountId) return;

    setSaving(true);
    try {
      const row = {
        transaction_type: txType,
        amount,
        date: txDate,
        account_id: txAccountId,
        to_account_id: txType === "transfer" ? txToAccountId : null,
        category: txType === "expense" ? txCategory : null,
        description: txDescription.trim() || null,
      };

      if (editingTransaction) {
        // Reverse old transaction's effect on balances
        const old = editingTransaction;
        if (old.transaction_type === "expense") {
          await adjustBalance(supabase, old.account_id, old.amount, "credit");
        } else if (old.transaction_type === "income") {
          await adjustBalance(supabase, old.account_id, old.amount, "debit");
        } else if (old.transaction_type === "transfer") {
          await adjustBalance(supabase, old.account_id, old.amount, "credit");
          if (old.to_account_id) await adjustBalance(supabase, old.to_account_id, old.amount, "debit");
        }

        await supabase
          .from("transactions")
          .update(row)
          .eq("id", editingTransaction.id);

        // Apply new transaction's effect on balances
        if (txType === "expense") {
          await adjustBalance(supabase, txAccountId, amount, "debit");
        } else if (txType === "income") {
          await adjustBalance(supabase, txAccountId, amount, "credit");
        } else if (txType === "transfer") {
          await adjustBalance(supabase, txAccountId, amount, "debit");
          await adjustBalance(supabase, txToAccountId, amount, "credit");
        }

        setToast("Transaction updated!");
      } else {
        await supabase
          .from("transactions")
          .insert({ ...row, user_id: user.id });

        if (txType === "expense") {
          await adjustBalance(supabase, txAccountId, amount, "debit");
        } else if (txType === "income") {
          await adjustBalance(supabase, txAccountId, amount, "credit");
        } else if (txType === "transfer") {
          await adjustBalance(supabase, txAccountId, amount, "debit");
          await adjustBalance(supabase, txToAccountId, amount, "credit");
        }

        setToast("Transaction saved!");
      }

      setShowModal(false);
      fetchData();
    } catch {
      setToast("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingTransaction) return;
    const tx = editingTransaction;

    setSaving(true);
    try {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", tx.id);

      // Reverse the deleted transaction's effect on balances
      if (tx.transaction_type === "expense") {
        await adjustBalance(supabase, tx.account_id, tx.amount, "credit");
      } else if (tx.transaction_type === "income") {
        await adjustBalance(supabase, tx.account_id, tx.amount, "debit");
      } else if (tx.transaction_type === "transfer") {
        await adjustBalance(supabase, tx.account_id, tx.amount, "credit");
        if (tx.to_account_id) await adjustBalance(supabase, tx.to_account_id, tx.amount, "debit");
      }

      setShowModal(false);
      setShowDeleteConfirm(false);
      setToast("Transaction deleted!");
      fetchData();
    } catch {
      setToast("Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubscriptionConfirm() {
    const sub = selectedSubscription;
    if (!sub) return;
    try {
      await supabase.from("transactions").insert({
        transaction_type: "expense",
        amount: sub.amount,
        date: new Date().toISOString().split("T")[0],
        account_id: sub.account_id,
        category: sub.category,
        description: sub.name,
        user_id: user.id,
      });
      await adjustBalance(supabase, sub.account_id, sub.amount, "debit");
      setShowModal(false);
      setSelectedSubscription(null);
      setToast("Subscription transaction saved!");
      fetchData();
    } catch {
      setToast("Failed to save");
    }
  }

  async function handleSubSave() {
    if (
      !subFormName.trim() ||
      !subFormAmount ||
      !subFormNextDate ||
      !subFormAccountId ||
      !subFormCategory
    )
      return;

    try {
      await supabase.from("subscription_reminders").insert({
        name: subFormName.trim(),
        amount: parseFloat(subFormAmount),
        billing_type: subFormBillingType,
        next_billing_date: subFormNextDate,
        account_id: subFormAccountId,
        category: subFormCategory,
        user_id: user.id,
      });

      setShowSubForm(false);
      setSubFormName("");
      setSubFormAmount("");
      setSubFormBillingType("monthly");
      setSubFormNextDate("");
      setSubFormAccountId(accounts[0]?.id || "");
      setSubFormCategory("miscellaneous");
      const { data } = await supabase
        .from("subscription_reminders")
        .select("*, accounts(name)")
        .order("next_billing_date", { ascending: true });
      setSubscriptions(data || []);
    } catch {
      // Silent fail for subscription save
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={8} height="h-14" />
      ) : (
        <>
          {/* Spending by Category */}
          {Object.keys(categorySpending).length > 0 && (
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Spending by Category
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(categorySpending)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div
                      key={cat}
                      className="min-w-[100px] w-[100px] bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2 shrink-0"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600"}`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {CATEGORY_ICONS[cat] || "more_horiz"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 text-center leading-tight">
                        {CATEGORY_LABELS[cat] || cat}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl">
                receipt_long
              </span>
              <p className="text-sm">No transactions yet.</p>
            </div>
          ) : (
          <div className="flex flex-col gap-1">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 pt-4 pb-2">
                {dateLabel}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => openEdit(tx)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-slate-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">
                        {CATEGORY_ICONS[tx.category] ||
                          (tx.transaction_type === "income"
                            ? "work"
                            : tx.transaction_type === "transfer"
                              ? "swap_horiz"
                              : "receipt")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.description ||
                          CATEGORY_LABELS[tx.category] ||
                          tx.transaction_type.charAt(0).toUpperCase() +
                            tx.transaction_type.slice(1)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tx.accounts?.name || ""}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ml-2 ${tx.transaction_type === "expense" ? "text-rose-500" : tx.transaction_type === "income" ? "text-finance" : "text-slate-500"}`}
                    >
                      {tx.transaction_type === "expense"
                        ? "-"
                        : tx.transaction_type === "income"
                          ? "+"
                          : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={openAdd}
        aria-label="Add new transaction"
        className="fixed bottom-20 right-5 w-14 h-14 bg-finance rounded-full flex items-center justify-center shadow-lg shadow-finance/30 z-20 active:bg-finance/90"
      >
        <span className="material-symbols-outlined text-white text-3xl">
          add
        </span>
      </button>

      {/* Transaction Modal */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setShowDeleteConfirm(false);
        }}
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      >
        <div className="flex flex-col gap-4">
          {/* Type tabs */}
          <div
            className={`grid gap-2 ${editingTransaction ? "grid-cols-3" : "grid-cols-4"}`}
          >
            {[
              { value: "expense", label: "Expense", icon: "outbox" },
              { value: "income", label: "Income", icon: "move_to_inbox" },
              { value: "transfer", label: "Transfer", icon: "swap_horiz" },
              ...(!editingTransaction
                ? [
                    {
                      value: "subscription",
                      label: "Subscription",
                      icon: "subscriptions",
                    },
                  ]
                : []),
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTxType(t.value);
                  if (t.value !== "subscription") {
                    setSelectedSubscription(null);
                    setShowSubForm(false);
                  }
                }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold border-2 ${
                  txType === t.value
                    ? "border-finance bg-finance/5 text-finance"
                    : "border-transparent bg-slate-100 text-slate-500"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Subscription views */}
          {txType === "subscription" ? (
            showSubForm ? (
              <>
                <button
                  onClick={() => setShowSubForm(false)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                  Back to list
                </button>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={subFormName}
                    onChange={(e) => setSubFormName(e.target.value)}
                    placeholder="e.g., Netflix"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Amount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={subFormAmount}
                    onChange={(e) => setSubFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">
                    Billing Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["monthly", "yearly"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSubFormBillingType(t)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                          subFormBillingType === t
                            ? "border-finance bg-finance/10 text-finance"
                            : "border-transparent bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t === "monthly" ? "Monthly" : "Yearly"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Next Billing Date
                  </label>
                  <input
                    type="date"
                    value={subFormNextDate}
                    onChange={(e) => setSubFormNextDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Account
                  </label>
                  <select
                    value={subFormAccountId}
                    onChange={(e) => setSubFormAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={subFormCategory}
                    onChange={(e) => setSubFormCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSubSave}
                  className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90"
                >
                  Add Subscription
                </button>
              </>
            ) : selectedSubscription ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-finance/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-finance text-3xl">
                    subscriptions
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Add subscription transaction?
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {selectedSubscription.name}
                </p>
                <p className="text-sm text-slate-500">
                  {formatCurrency(selectedSubscription.amount)} →{" "}
                  {selectedSubscription.accounts?.name}
                </p>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setSelectedSubscription(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 active:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubscriptionConfirm}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-finance text-white active:bg-finance/90"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <>
                {subscriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">
                      subscriptions
                    </span>
                    <p className="text-sm">No subscriptions yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubscription(sub)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer active:bg-slate-100"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">
                            {sub.name}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(sub.amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">
                            {sub.accounts?.name}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-500 rounded px-1.5 py-0.5">
                            {sub.billing_type === "monthly"
                              ? "Monthly"
                              : "Yearly"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowSubForm(true)}
                  className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 flex items-center justify-center gap-2 active:bg-finance/90"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  Add New Subscription
                </button>
              </>
            )
          ) : (
            <>
              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-finance/20 focus:border-finance w-full"
                  />
                </div>
              </div>

              {/* Date + Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    {txType === "transfer" ? "From" : "Account"}
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  >
                    <option value="">Select</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To Account (transfer) */}
              {txType === "transfer" && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    To Account
                  </label>
                  <select
                    value={txToAccountId}
                    onChange={(e) => setTxToAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  >
                    <option value="">Select</option>
                    {accounts
                      .filter((a) => a.id !== txAccountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Category (expense only) */}
              {txType === "expense" && (
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-2 block">
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTxCategory(c)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold border-2 ${
                          txCategory === c
                            ? "border-finance bg-finance/5 text-finance"
                            : "border-transparent bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {CATEGORY_ICONS[c]}
                        </span>
                        {CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="What was this for?"
                  rows={2}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 flex items-center justify-center gap-2 active:bg-finance/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                {saving ? "Saving..." : editingTransaction ? "Save Changes" : "Save Transaction"}
              </button>

              {/* Delete button (edit mode only) */}
              {editingTransaction && (
                <div className="mt-1">
                  {showDeleteConfirm ? (
                    <div className="flex items-center justify-center gap-3">
                      <p className="text-sm font-medium text-slate-600">
                        Are you sure?
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 active:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white active:bg-rose-600 disabled:opacity-50"
                      >
                        {saving ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-rose-200 text-rose-500 active:bg-rose-50"
                    >
                      Delete Transaction
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </BottomSheet>

      {toast && (
        <Toast
          message={toast}
          isVisible={!!toast}
          onDismiss={() => setToast("")}
        />
      )}
    </div>
  );
}
