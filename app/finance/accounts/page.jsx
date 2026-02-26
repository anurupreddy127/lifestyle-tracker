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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("checking");
  const [formStartingBalance, setFormStartingBalance] = useState("");

  async function fetchAccounts() {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });
    setAccounts(data || []);
    // setLoading is now handled in useEffect
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchAccounts();
      setLoading(false);
    };
    fetchData();
  }, []);

  function openAdd() {
    setEditingAccount(null);
    setFormName("");
    setFormType("checking");
    setFormStartingBalance("");
    setShowModal(true);
  }

  function openEdit(account) {
    setEditingAccount(account);
    setFormName(account.name);
    setFormType(account.account_type);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;

    if (editingAccount) {
      await supabase
        .from("accounts")
        .update({ name: formName.trim() })
        .eq("id", editingAccount.id);
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

    setShowModal(false);
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
              <p
                className={`text-sm font-bold ${acc.account_type === "credit_card" ? "text-rose-500" : "text-slate-900"}`}
              >
                {formatBalance(acc.balance)}
              </p>
            </div>
          ))}
        </div>
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
        onClose={() => setShowModal(false)}
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

          {!editingAccount && (
            <div>
              <label className="text-sm font-medium text-slate-500 mb-1.5 block">
                Starting Balance
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
        </div>
      </BottomSheet>
    </div>
  );
}
