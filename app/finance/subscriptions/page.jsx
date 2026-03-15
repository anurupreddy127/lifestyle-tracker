"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useCategories } from "@/hooks/useCategories";
import SwipeableCard from "@/components/SwipeableCard";

export default function SubscriptionReminders() {
  const { supabase, user } = useAuth();
  const { categories } = useCategories();
  const [reminders, setReminders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formBillingType, setFormBillingType] = useState("monthly");
  const [formNextDate, setFormNextDate] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    try {
      const [remindersRes, accountsRes] = await Promise.all([
        supabase
          .from("subscription_reminders")
          .select("*, accounts(name)")
          .order("next_billing_date", { ascending: true }),
        supabase
          .from("accounts")
          .select("id, name")
          .order("created_at", { ascending: true }),
      ]);
      setReminders(remindersRes.data || []);
      setAccounts(accountsRes.data || []);
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

  function openAdd() {
    setEditingReminder(null);
    setFormName("");
    setFormAmount("");
    setFormBillingType("monthly");
    setFormNextDate("");
    setFormAccountId(accounts[0]?.id || "");
    setFormCategory(categories[categories.length - 1]?.name || "");
    setShowModal(true);
  }

  function openEdit(reminder) {
    setEditingReminder(reminder);
    setFormName(reminder.name);
    setFormAmount(String(reminder.amount));
    setFormBillingType(reminder.billing_type);
    setFormNextDate(reminder.next_billing_date);
    setFormAccountId(reminder.account_id);
    setFormCategory(reminder.category);
    setShowModal(true);
  }

  async function handleSave() {
    if (
      !formName.trim() ||
      !formAmount ||
      !formNextDate ||
      !formAccountId ||
      !formCategory
    )
      return;

    setSaving(true);
    try {
      const row = {
        name: formName.trim(),
        amount: parseFloat(formAmount),
        billing_type: formBillingType,
        next_billing_date: formNextDate,
        account_id: formAccountId,
        category: formCategory,
      };

      if (editingReminder) {
        await supabase
          .from("subscription_reminders")
          .update(row)
          .eq("id", editingReminder.id);
      } else {
        await supabase
          .from("subscription_reminders")
          .insert({ ...row, user_id: user.id });
      }

      setShowModal(false);
      fetchData();
    } catch {
      // Silent fail for subscription save
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await supabase.from("subscription_reminders").delete().eq("id", id);
      fetchData();
    } catch {
      // Silent fail for subscription delete
    }
  }

  function isPastDue(dateStr) {
    return dateStr <= new Date().toISOString().split("T")[0];
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <span className="material-symbols-outlined text-5xl">
            subscriptions
          </span>
          <p className="text-sm">No subscription reminders yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((rem) => {
            const pastDue = isPastDue(rem.next_billing_date);
            return (
              <SwipeableCard
                key={rem.id}
                id={`sub-${rem.id}`}
                onEdit={() => openEdit(rem)}
                onDelete={() => handleDelete(rem.id)}
              >
                <div
                  className={`glass rounded-2xl p-4 border shadow-sm shadow-black/[0.03] ${pastDue ? "border-amber-400" : "border-white/30"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-bold text-slate-900">
                        {rem.name}
                      </h3>
                      <p className="text-base font-bold text-slate-900">
                        {formatCurrency(rem.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium ${pastDue ? "text-amber-500" : "text-slate-500"}`}
                      >
                        Due: {formatDate(rem.next_billing_date)}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        {rem.accounts?.name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-[10px] font-bold uppercase bg-white/40 text-slate-500 rounded px-1.5 py-0.5">
                        {rem.billing_type === "monthly" ? "Monthly" : "Yearly"}
                      </span>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            );
          })}
        </div>
      )}

      <button
        onClick={openAdd}
        aria-label="Add new subscription"
        className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-6 flex items-center justify-center gap-2 active:bg-finance/90 shadow-lg shadow-finance/20"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Subscription
      </button>

      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingReminder ? "Edit Subscription" : "Add Subscription"}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Netflix"
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
                  onClick={() => setFormBillingType(t)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 ${formBillingType === t ? "border-finance bg-finance/10 text-finance" : "border-transparent bg-slate-100 text-slate-600"}`}
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
              value={formNextDate}
              onChange={(e) => setFormNextDate(e.target.value)}
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Account
            </label>
            <select
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
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
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingReminder ? "Save Changes" : "Add Subscription"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
