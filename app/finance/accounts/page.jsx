"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import SwipeableCard from "@/components/SwipeableCard";
import { recalculateBalance } from "@/lib/balanceUtils";

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

const BADGE_COLORS = {
  checking: "bg-emerald-500",
  savings: "bg-blue-500",
  credit_card: "bg-rose-500",
  cash: "bg-amber-500",
};

function resizeImage(file, maxWidth = 800, maxHeight = 600) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AccountManager() {
  const { supabase, user } = useAuth();
  const fileInputRef = useRef(null);
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
  const [formImageFile, setFormImageFile] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchAccounts() {
    try {
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
          .select("amount, personal_amount, account_id, accounts!transactions_account_id_fkey(name, account_type)")
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
        byAcc[r.account_id].total += Number(r.personal_amount ?? r.amount);
      });
      setAccountSpending(
        Object.entries(byAcc)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3),
      );
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchAccounts();
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getOrdinal(day) {
    const s = ["th", "st", "nd", "rd"];
    const v = day % 100;
    return day + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  async function uploadAccountImage(file, accountId) {
    const resized = await resizeImage(file);
    const path = `${user.id}/${accountId}-${Date.now()}.jpg`;
    await supabase.storage.from("account-images").upload(path, resized, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const { data } = supabase.storage.from("account-images").getPublicUrl(path);
    return data.publicUrl;
  }

  function openAdd() {
    setEditingAccount(null);
    setFormName("");
    setFormType("checking");
    setFormStartingBalance("");
    setFormCreditLimit("");
    setFormAvailableCredit("");
    setFormDueDate("");
    setFormImageFile(null);
    setFormImagePreview("");
    setImageRemoved(false);
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
    setFormImageFile(null);
    setFormImagePreview(account.image_url || "");
    setImageRemoved(false);
    setShowDeleteConfirm(false);
    setDeleteError("");
    setShowModal(true);
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImageFile(file);
    setFormImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  }

  function handleImageRemove() {
    setFormImageFile(null);
    setFormImagePreview("");
    setImageRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    if (!formName.trim()) return;

    setSaving(true);
    try {
      let accountId = editingAccount?.id;

      if (editingAccount) {
        const updateData = { name: formName.trim() };

        if (formType === "credit_card") {
          const creditLimit = parseFloat(formCreditLimit) || 0;
          const availableCredit = parseFloat(formAvailableCredit) || 0;
          const dueDate = parseInt(formDueDate) || null;
          updateData.credit_limit = creditLimit;
          updateData.due_date = dueDate;
          updateData.starting_balance = creditLimit - availableCredit;
        } else {
          const enteredBalance = parseFloat(formStartingBalance) || 0;
          // Form shows current balance; adjust starting_balance so recalculation yields entered value
          const txEffect = (editingAccount.balance || 0) - (editingAccount.starting_balance || 0);
          updateData.starting_balance = enteredBalance - txEffect;
        }

        await supabase
          .from("accounts")
          .update(updateData)
          .eq("id", editingAccount.id);

        // Recalculate balance from starting_balance + all transactions
        await recalculateBalance(supabase, editingAccount.id);
      } else {
        let insertData;
        if (formType === "credit_card") {
          const creditLimit = parseFloat(formCreditLimit) || 0;
          const availableCredit = parseFloat(formAvailableCredit) || 0;
          const dueDate = parseInt(formDueDate) || null;
          insertData = {
            name: formName.trim(),
            account_type: formType,
            credit_limit: creditLimit,
            available_credit: availableCredit,
            due_date: dueDate,
            starting_balance: creditLimit - availableCredit,
            balance: creditLimit - availableCredit,
            user_id: user.id,
          };
        } else {
          const bal = parseFloat(formStartingBalance) || 0;
          insertData = {
            name: formName.trim(),
            account_type: formType,
            starting_balance: bal,
            balance: bal,
            user_id: user.id,
          };
        }

        const { data: inserted } = await supabase
          .from("accounts")
          .insert(insertData)
          .select("id")
          .single();
        accountId = inserted?.id;
      }

      // Handle image upload/removal
      if (formImageFile && accountId) {
        const imageUrl = await uploadAccountImage(formImageFile, accountId);
        await supabase
          .from("accounts")
          .update({ image_url: imageUrl })
          .eq("id", accountId);
      } else if (imageRemoved && editingAccount?.image_url) {
        await supabase
          .from("accounts")
          .update({ image_url: null })
          .eq("id", accountId);
      }

      setShowModal(false);
      fetchAccounts();
    } catch {
      // Silent fail for account save
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingAccount) return;
    try {
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
    } catch {
      // Silent fail for account delete
    }
  }

  function formatBalance(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function renderAccountCard(acc) {
    const hasImage = !!acc.image_url;

    return (
      <div
        className={`relative rounded-2xl overflow-hidden h-44 ${
          hasImage ? "" : "glass shadow-sm shadow-black/[0.03]"
        }`}
      >
        {/* Background image */}
        {hasImage && (
          <>
            <img
              src={acc.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        {/* Content */}
        <div className="relative h-full p-4 flex flex-col justify-between">
          <div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                hasImage
                  ? `${BADGE_COLORS[acc.account_type] || "bg-slate-500"} text-white`
                  : TYPE_COLORS[acc.account_type] || "bg-slate-100 text-slate-500"
              }`}
            >
              {TYPE_LABELS[acc.account_type]}
            </span>
            <h3
              className={`text-lg font-bold mt-2 truncate ${
                hasImage ? "text-white" : "text-slate-900"
              }`}
            >
              {acc.name}
            </h3>
          </div>

          <div>
            {acc.account_type === "credit_card" ? (
              <>
                <p className={`text-xs ${hasImage ? "text-white/70" : "text-slate-500"}`}>
                  Current Balance
                </p>
                <p className={`text-2xl font-bold ${hasImage ? "text-white" : "text-rose-500"}`}>
                  {acc.balance > 0 ? "-" : ""}{formatBalance(acc.balance)}
                </p>
                <p className={`text-[10px] mt-0.5 ${hasImage ? "text-white/60" : "text-slate-400"}`}>
                  {formatBalance(acc.available_credit || 0)} of{" "}
                  {formatBalance(acc.credit_limit || 0)}
                  {acc.due_date && ` · Due: ${getOrdinal(acc.due_date)}`}
                </p>
              </>
            ) : (
              <>
                <p className={`text-xs ${hasImage ? "text-white/70" : "text-slate-500"}`}>
                  Available Balance
                </p>
                <p className={`text-2xl font-bold ${hasImage ? "text-white" : "text-slate-900"}`}>
                  {formatBalance(acc.balance)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
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
                    className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
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
              <SwipeableCard
                key={acc.id}
                id={`account-${acc.id}`}
                onEdit={() => openEdit(acc)}
                onDelete={() => {
                  openEdit(acc);
                  setTimeout(() => setShowDeleteConfirm(true), 100);
                }}
              >
                {renderAccountCard(acc)}
              </SwipeableCard>
            ))}
          </div>
        </>
      )}

      <button
        onClick={openAdd}
        aria-label="Add new account"
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
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>

          {/* Image Picker */}
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Card Background
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {formImagePreview ? (
              <div className="relative rounded-xl overflow-hidden h-32">
                <img
                  src={formImagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <button
                  onClick={handleImageRemove}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-white text-[16px]">
                    close
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    edit
                  </span>
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-white/40 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 active:bg-white/40"
              >
                <span className="material-symbols-outlined text-[24px]">
                  add_photo_alternate
                </span>
                <span className="text-xs font-medium">Add Photo</span>
              </button>
            )}
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
                  className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                  className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                  className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingAccount ? "Save Changes" : "Add Account"}
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
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 active:bg-white/50"
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
