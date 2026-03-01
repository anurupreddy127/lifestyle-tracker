"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { adjustBalance } from "@/lib/balanceUtils";
import { useCategories, EMOJI_OPTIONS } from "@/hooks/useCategories";

const ACCOUNT_TYPE_ICONS = {
  checking: "account_balance",
  savings: "savings",
  credit_card: "credit_card",
  cash: "payments",
};

const ACCOUNT_TYPE_COLORS = {
  checking: "bg-indigo-100 text-indigo-600",
  savings: "bg-blue-100 text-blue-600",
  credit_card: "bg-rose-100 text-rose-600",
  cash: "bg-emerald-100 text-emerald-600",
};


const TYPE_LABELS = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
};

export default function FinanceDashboard() {
  const router = useRouter();
  const { supabase, user } = useAuth();
  const { categories, addCategory, deleteCategory, getCategoryColor, getCategoryEmoji } = useCategories();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categorySpending, setCategorySpending] = useState({});
  const [accountSpending, setAccountSpending] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📦");
  const [editingCategories, setEditingCategories] = useState(false);

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
  const [txPersonalAmount, setTxPersonalAmount] = useState("");

  // Subscription quick-pay
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subFormName, setSubFormName] = useState("");
  const [subFormAmount, setSubFormAmount] = useState("");
  const [subFormBillingType, setSubFormBillingType] = useState("monthly");
  const [subFormNextDate, setSubFormNextDate] = useState("");
  const [subFormAccountId, setSubFormAccountId] = useState("");
  const [subFormCategory, setSubFormCategory] = useState("miscellaneous");

  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  async function fetchData() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const today = now.toISOString().split("T")[0];

      const [accountsRes, incomeRes, expenseDetailRes, subsRes] =
        await Promise.all([
          supabase
            .from("accounts")
            .select("*")
            .order("created_at", { ascending: true }),
          supabase
            .from("transactions")
            .select("amount")
            .eq("transaction_type", "income")
            .gte("date", startOfMonth)
            .lte("date", today),
          supabase
            .from("transactions")
            .select("amount, personal_amount, category, account_id, accounts!transactions_account_id_fkey(name, account_type)")
            .eq("transaction_type", "expense")
            .gte("date", startOfMonth)
            .lte("date", today),
          supabase
            .from("subscription_reminders")
            .select("*, accounts(name)")
            .order("next_billing_date", { ascending: true }),
        ]);

      setAccounts(accountsRes.data || []);
      setSubscriptions(subsRes.data || []);
      setTotalIncome(
        (incomeRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0),
      );

      const expenses = expenseDetailRes.data || [];
      setTotalExpenses(expenses.reduce((s, r) => s + Number(r.personal_amount ?? r.amount), 0));

      const byCat = {};
      expenses.forEach((r) => {
        if (r.category) byCat[r.category] = (byCat[r.category] || 0) + Number(r.personal_amount ?? r.amount);
      });
      setCategorySpending(byCat);

      const byAcc = {};
      expenses.forEach((r) => {
        if (!byAcc[r.account_id]) {
          byAcc[r.account_id] = { name: r.accounts?.name, type: r.accounts?.account_type, total: 0 };
        }
        byAcc[r.account_id].total += Number(r.personal_amount ?? r.amount);
      });
      setAccountSpending(
        Object.entries(byAcc)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3),
      );

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchDataAsync = async () => {
      await fetchData();
    };
    fetchDataAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddTransaction() {
    setTxType("expense");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxAmount("");
    setTxAccountId(accounts[0]?.id || "");
    setTxToAccountId("");
    setTxCategory(categories[0]?.name || "");
    setTxDescription("");
    setTxPersonalAmount("");
    setSelectedSubscription(null);
    setShowSubForm(false);
    setSubFormName("");
    setSubFormAmount("");
    setSubFormBillingType("monthly");
    setSubFormNextDate("");
    setSubFormAccountId(accounts[0]?.id || "");
    setSubFormCategory(categories[categories.length - 1]?.name || "");
    setShowModal(true);
  }

  async function handleSaveTransaction() {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) return;
    if (!txAccountId) return;
    if (txType === "transfer" && !txToAccountId) return;
    if (txType === "transfer" && txAccountId === txToAccountId) return;

    // Validate personal amount for expenses
    let personalAmount = amount;
    if (txType === "expense" && txPersonalAmount.trim() !== "") {
      personalAmount = parseFloat(txPersonalAmount);
      if (isNaN(personalAmount) || personalAmount < 0) return;
      if (personalAmount > amount) return;
    }

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
        personal_amount: txType === "expense" ? personalAmount : null,
        user_id: user.id,
      };

      await supabase.from("transactions").insert(row);

      if (txType === "expense") {
        await adjustBalance(supabase, txAccountId, amount, "debit");
      } else if (txType === "income") {
        await adjustBalance(supabase, txAccountId, amount, "credit");
      } else if (txType === "transfer") {
        await adjustBalance(supabase, txAccountId, amount, "debit");
        await adjustBalance(supabase, txToAccountId, amount, "credit");
      }

      setShowModal(false);
      setToast("Transaction saved!");
      fetchData();
    } catch {
      setToast("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubscriptionConfirm() {
    const sub = selectedSubscription;
    if (!sub) return;

    setSaving(true);
    try {
      await supabase.from("transactions").insert({
        transaction_type: "expense",
        amount: sub.amount,
        personal_amount: sub.amount,
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
    } finally {
      setSaving(false);
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
      setSubFormCategory(categories[categories.length - 1]?.name || "");
      // Re-fetch subscriptions
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

  const net = totalIncome - totalExpenses;

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Month label */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        {currentMonth}
      </p>

      {loading ? (
        <LoadingSkeleton count={6} height="h-16" />
      ) : (
        <>
          {/* Section 1 — Cash Flow Cards */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-finance text-[16px]">
                  arrow_upward
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Income
                </p>
              </div>
              <p className="text-base font-bold text-finance">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-rose-500 text-[16px]">
                  arrow_downward
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Expenses
                </p>
              </div>
              <p className="text-base font-bold text-rose-500">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[16px]" style={{ color: net >= 0 ? "#10b981" : "#f43f5e" }}>
                  balance
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Net
                </p>
              </div>
              <p className={`text-base font-bold ${net >= 0 ? "text-finance" : "text-rose-500"}`}>
                {formatCurrency(net)}
              </p>
            </div>
          </div>

          {/* Section 2 — Spending by Category */}
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Spending by Category
          </h2>
          {Object.keys(categorySpending).length === 0 ? (
            <p className="text-sm text-slate-400 mb-6">No expenses this month.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {Object.entries(categorySpending)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <div
                    key={cat}
                    className="min-w-[100px] w-[100px] bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2 shrink-0"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getCategoryColor(cat)}`}>
                      <span className="text-lg">{getCategoryEmoji(cat)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center leading-tight">
                      {cat}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(amount)}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Section 3 — Top Accounts */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Top Accounts
            </h2>
            <button
              onClick={() => router.push("/finance/accounts")}
              className="text-xs font-semibold text-finance"
            >
              View All
            </button>
          </div>
          {accountSpending.length === 0 ? (
            <p className="text-sm text-slate-400">No spending this month.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {accountSpending.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${ACCOUNT_TYPE_COLORS[acc.type] || "bg-slate-100 text-slate-500"}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {ACCOUNT_TYPE_ICONS[acc.type] || "account_balance"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {acc.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TYPE_LABELS[acc.type] || acc.type}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(acc.total)}
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
        aria-label="Add new transaction"
        className="fixed bottom-20 right-5 w-14 h-14 bg-finance rounded-full flex items-center justify-center shadow-lg shadow-finance/30 z-20 active:bg-finance/90"
      >
        <span className="material-symbols-outlined text-white text-3xl">
          add
        </span>
      </button>

      {/* Add Transaction Modal */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Transaction"
      >
        <div className="flex flex-col gap-4">
          {/* Type tabs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "expense", label: "Expense", icon: "outbox" },
              { value: "income", label: "Income", icon: "move_to_inbox" },
              { value: "transfer", label: "Transfer", icon: "swap_horiz" },
              {
                value: "subscription",
                label: "Subscription",
                icon: "subscriptions",
              },
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
              /* --- Add New Subscription Form --- */
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Account
                  </label>
                  <select
                    value={subFormAccountId}
                    onChange={(e) => setSubFormAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.emoji} {cat.name}
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
              /* --- Confirmation View --- */
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
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-finance text-white active:bg-finance/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </div>
            ) : (
              /* --- Subscription List --- */
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
            /* --- Normal Transaction Form (Expense/Income/Transfer) --- */
            <>
              {/* Amount + Your Share grouped */}
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    {txType === "expense" ? "Total Amount" : "Amount"}
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
                {txType === "expense" && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                      Your Share
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={txPersonalAmount}
                        onChange={(e) => setTxPersonalAmount(e.target.value)}
                        placeholder={txAmount || "Same as total"}
                        className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-finance/20 focus:border-finance w-full"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Leave empty if you paid for yourself only
                    </p>
                  </div>
                )}
              </div>

              {/* Date + Account */}
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full min-w-0"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                    {txType === "transfer" ? "From" : "Account"}
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-500">
                      Category
                    </label>
                    <button
                      onClick={() => setEditingCategories(!editingCategories)}
                      className="text-xs font-semibold text-finance"
                    >
                      {editingCategories ? "Done" : "Edit"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          if (editingCategories) {
                            deleteCategory(cat.id);
                            if (txCategory === cat.name) setTxCategory(categories[0]?.name || "");
                          } else {
                            setTxCategory(cat.name);
                          }
                        }}
                        className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold border-2 ${
                          !editingCategories && txCategory === cat.name
                            ? "border-finance bg-finance/5 text-finance"
                            : "border-transparent bg-slate-50 text-slate-500"
                        }`}
                      >
                        {editingCategories && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">✕</span>
                          </div>
                        )}
                        <span className="text-lg">{cat.emoji}</span>
                        {cat.name}
                      </button>
                    ))}
                    {!editingCategories && (
                      <button
                        onClick={() => {
                          setNewCatName("");
                          setNewCatEmoji("📦");
                          setShowAddCategory(true);
                        }}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400"
                      >
                        <span className="text-lg">+</span>
                        Add
                      </button>
                    )}
                  </div>
                  {showAddCategory && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Category Name
                        </label>
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="e.g., Pets"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Choose Emoji
                        </label>
                        <div className="grid grid-cols-10 gap-1">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setNewCatEmoji(emoji)}
                              className={`w-8 h-8 rounded-lg text-base flex items-center justify-center ${
                                newCatEmoji === emoji
                                  ? "bg-finance/10 ring-2 ring-finance"
                                  : "bg-white"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddCategory(false)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (newCatName.trim()) {
                              const result = await addCategory(newCatName, newCatEmoji);
                              if (result.data) {
                                setTxCategory(result.data.name);
                                setShowAddCategory(false);
                              } else {
                                setToast(result.error || "Failed to add category");
                              }
                            }
                          }}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-finance text-white"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
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
                onClick={handleSaveTransaction}
                disabled={saving}
                className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 flex items-center justify-center gap-2 active:bg-finance/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                {saving ? "Saving..." : "Save Transaction"}
              </button>
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
