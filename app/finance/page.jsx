"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";

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

export default function FinanceDashboard() {
  const router = useRouter();
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");

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

  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  async function fetchData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];

    const [accountsRes, txRes, incomeRes, expenseRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("*, accounts!transactions_account_id_fkey(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("transactions")
        .select("amount")
        .eq("transaction_type", "income")
        .gte("date", startOfMonth)
        .lte("date", today),
      supabase
        .from("transactions")
        .select("amount")
        .eq("transaction_type", "expense")
        .gte("date", startOfMonth)
        .lte("date", today),
    ]);

    setAccounts(accountsRes.data || []);
    setTransactions(txRes.data || []);
    setTotalIncome(
      (incomeRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0),
    );
    setTotalExpenses(
      (expenseRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0),
    );
    setLoading(false);
  }

  useEffect(() => {
    const fetchDataAsync = async () => {
      await fetchData();
    };
    fetchDataAsync();
  }, []);

  function openAddTransaction() {
    setTxType("expense");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxAmount("");
    setTxAccountId(accounts[0]?.id || "");
    setTxToAccountId("");
    setTxCategory("food");
    setTxDescription("");
    setShowModal(true);
  }

  async function handleSaveTransaction() {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) return;
    if (!txAccountId) return;
    if (txType === "transfer" && !txToAccountId) return;
    if (txType === "transfer" && txAccountId === txToAccountId) return;

    const row = {
      transaction_type: txType,
      amount,
      date: txDate,
      account_id: txAccountId,
      to_account_id: txType === "transfer" ? txToAccountId : null,
      category: txType === "expense" ? txCategory : null,
      description: txDescription.trim() || null,
      user_id: user.id,
    };

    await supabase.from("transactions").insert(row);
    setShowModal(false);
    setToast("Transaction saved!");
    fetchData();
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
          {/* Summary Cards */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-finance text-[18px]">
                  arrow_upward
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Income
                </p>
              </div>
              <p className="text-xl font-bold text-finance">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-rose-500 text-[18px]">
                  arrow_downward
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Expenses
                </p>
              </div>
              <p className="text-xl font-bold text-rose-500">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-finance text-[18px]">
                  balance
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Net Balance
                </p>
              </div>
              <p
                className={`text-xl font-bold ${net >= 0 ? "text-finance" : "text-rose-500"}`}
              >
                {formatCurrency(net)}
              </p>
            </div>
          </div>

          {/* Account Balances */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Account Balances
            </h2>
            <button
              onClick={() => router.push("/finance/accounts")}
              className="text-xs font-semibold text-finance"
            >
              View All
            </button>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400 mb-6">No accounts yet.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${ACCOUNT_TYPE_COLORS[acc.account_type] || "bg-slate-100 text-slate-500"}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {ACCOUNT_TYPE_ICONS[acc.account_type] ||
                        "account_balance"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {acc.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {acc.account_type === "credit_card"
                        ? "Credit Card"
                        : acc.account_type.charAt(0).toUpperCase() +
                          acc.account_type.slice(1)}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold ${acc.account_type === "credit_card" ? "text-rose-500" : "text-slate-900"}`}
                  >
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Recent Transactions
            </h2>
            <button
              onClick={() => router.push("/finance/transactions")}
              className="text-xs font-semibold text-finance"
            >
              See History
            </button>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-400">No transactions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
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
                      {formatDate(tx.date)} · {tx.accounts?.name || ""}
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
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={openAddTransaction}
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
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "expense", label: "Expense", icon: "outbox" },
              { value: "income", label: "Income", icon: "move_to_inbox" },
              { value: "transfer", label: "Transfer", icon: "swap_horiz" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTxType(t.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold border-2 ${
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
            onClick={handleSaveTransaction}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 flex items-center justify-center gap-2 active:bg-finance/90"
          >
            <span className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            Save Transaction
          </button>
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
