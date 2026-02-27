"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const TYPE_LABELS = {
  checking: "Checking",
  credit_card: "Credit Card",
  cash: "Cash",
  savings: "Savings",
};

const TYPE_OPTIONS = ["checking", "credit_card", "cash", "savings"];

const TYPE_ICONS = {
  checking: "account_balance",
  savings: "savings",
  credit_card: "credit_card",
  cash: "payments",
};

const TYPE_COLORS = {
  checking: "bg-indigo-100 text-indigo-600",
  savings: "bg-blue-100 text-blue-600",
  credit_card: "bg-rose-100 text-rose-600",
  cash: "bg-emerald-100 text-emerald-600",
};

export default function AccountManager() {
  const { supabase, user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountSpending, setAccountSpending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("checking");
  const [formStartingBalance, setFormStartingBalance] = useState("");
  const [formCreditLimit, setFormCreditLimit] = useState("");
  const [formAvailableCredit, setFormAvailableCredit] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function fetchAccounts() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];

    const [accountsRes, expenseRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("amount, account_id, accounts!transactions_account_id_fkey(name, account_type)")
        .eq("transaction_type", "expense")
        .gte("date", startOfMonth)
        .lte("date", today),
    ]);

    setAccounts(accountsRes.data || []);

    const expenses = expenseRes.data || [];
    const byAcc = {};
    expenses.forEach((r) => {
      if (!byAcc[r.account_id]) {
        byAcc[r.account_id] = { name: r.accounts?.name, type: r.accounts?.account_type, total: 0 };
      }
      byAcc[r.account_id].total += Number(r.amount);
    });
    setAccountSpending(
      Object.entries(byAcc)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3),
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchAccounts();
      setLoading(false);
    };
    fetchData();
  }, []);

  function getOrdinal(day) {
    const s = ["th", "st", "nd", "rd"];
    const v = day % 100;
    return day + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function openAdd() {
    setEditingAccount(null);
    setFormName("");
    setFormType("checking");
    setFormStartingBalance("");
    setFormCreditLimit("");
    setFormAvailableCredit("");
    setFormDueDate("");
    setShowDeleteConfirm(false);
    setDeleteError("");
    setShowModal(true);
  }

  function openEdit(account) {
    setEditingAccount(account);
    setFormName(account.name);
    setFormType(account.account_type);
    setFormStartingBalance(account.balance != null ? String(account.balance) : "");
    setFormCreditLimit(account.credit_limit != null ? String(account.credit_limit) : "");
    setFormAvailableCredit(account.available_credit != null ? String(account.available_credit) : "");
    setFormDueDate(account.due_date != null ? String(account.due_date) : "");
    setShowDeleteConfirm(false);
    setDeleteError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;

    if (editingAccount) {
      const updateData = { name: formName.trim() };

      if (formType === "credit_card") {
        const creditLimit = parseFloat(formCreditLimit) || 0;
        const availableCredit = parseFloat(formAvailableCredit) || 0;
        const dueDate = parseInt(formDueDate) || null;
        updateData.credit_limit = creditLimit;
        updateData.available_credit = availableCredit;
        updateData.due_date = dueDate;
        updateData.balance = creditLimit - availableCredit;
      } else {
        const bal = parseFloat(formStartingBalance) || 0;
        updateData.balance = bal;
      }

      await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", editingAccount.id);
    } else {
      if (formType === "credit_card") {
        const creditLimit = parseFloat(formCreditLimit) || 0;
        const availableCredit = parseFloat(formAvailableCredit) || 0;
        const dueDate = parseInt(formDueDate) || null;
        await supabase.from("accounts").insert({
          name: formName.trim(),
          account_type: formType,
          credit_limit: creditLimit,
          available_credit: availableCredit,
          due_date: dueDate,
          starting_balance: 0,
          balance: creditLimit - availableCredit,
          user_id: user.id,
        });
      } else {
        const bal = parseFloat(formStartingBalance) || 0;
        await supabase.from("accounts").insert({
          name: formName.trim(),
          account_type: formType,
          starting_balance: bal,
          balance: bal,
          user_id: user.id,
        });
      }
    }

    setShowModal(false);
    fetchAccounts();
  }

  async function handleDelete() {
    if (!editingAccount) return;
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", editingAccount.id);

    if (error) {
      setDeleteError("Remove linked transactions and subscriptions first.");
      setShowDeleteConfirm(false);
      return;
    }

    setShowModal(false);
    setShowDeleteConfirm(false);
    setDeleteError("");
    fetchAccounts();
  }

  function formatBalance(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={3} height="h-20" />
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <span className="material-symbols-outlined text-5xl">
            account_balance_wallet
          </span>
          <p className="text-sm">No accounts yet. Add your first one!</p>
        </div>
      ) : (
        <>
          {/* Top Accounts by Spending */}
          {accountSpending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Top Accounts
              </h2>
              <div className="flex flex-col gap-2">
                {accountSpending.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[acc.type] || "bg-slate-100 text-slate-500"}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {TYPE_ICONS[acc.type] || "account_balance"}
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
                      {formatBalance(acc.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Accounts */}
          <h2 className="text-base font-bold text-slate-900 mb-3">
            All Accounts
          </h2>
          <div className="flex flex-col gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => openEdit(acc)}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer active:bg-slate-50 shadow-sm"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[acc.account_type] || "bg-slate-100 text-slate-500"}`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {TYPE_ICONS[acc.account_type] || "account_balance"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {acc.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {TYPE_LABELS[acc.account_type]}
                </p>
              </div>
              {acc.account_type === "credit_card" ? (
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-rose-500">
                    {formatBalance((acc.credit_limit || 0) - (acc.available_credit || 0))}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatBalance(acc.available_credit || 0)} of{" "}
                    {formatBalance(acc.credit_limit || 0)}
                  </p>
                  {acc.due_date && (
                    <p className="text-[10px] text-slate-400">
                      Due: {getOrdinal(acc.due_date)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-bold text-slate-900">
                  {formatBalance(acc.balance)}
                </p>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      <button
        onClick={openAdd}
        className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-6 flex items-center justify-center gap-2 active:bg-finance/90 shadow-lg shadow-finance/20"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Account
      </button>

      <BottomSheet
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setShowDeleteConfirm(false);
          setDeleteError("");
        }}
        title={editingAccount ? "Edit Account" : "Add Account"}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Account Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Chase Checking"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-500 mb-2 block">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => !editingAccount && setFormType(t)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                    formType === t
                      ? "border-finance bg-finance/10 text-finance"
                      : "border-transparent bg-slate-100 text-slate-600"
                  } ${editingAccount ? "opacity-50" : ""}`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {formType === "credit_card" ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                  Credit Limit
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                  Available Credit
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formAvailableCredit}
                  onChange={(e) => setFormAvailableCredit(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                  Due Date (Day of Month)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formDueDate}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                      setFormDueDate(val);
                    }
                  }}
                  placeholder="1-31"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formStartingBalance}
                onChange={(e) => setFormStartingBalance(e.target.value)}
                placeholder="0.00"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90"
          >
            {editingAccount ? "Save Changes" : "Add Account"}
          </button>

          {editingAccount && (
            <div className="mt-1">
              {deleteError && (
                <p className="text-xs text-rose-500 text-center mb-2">
                  {deleteError}
                </p>
              )}
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
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white active:bg-rose-600"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-rose-200 text-rose-500 active:bg-rose-50"
                >
                  Delete Account
                </button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
