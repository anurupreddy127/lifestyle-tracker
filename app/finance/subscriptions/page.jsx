"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
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

export default function SubscriptionReminders() {
  const { supabase, user } = useAuth();
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
  const [formCategory, setFormCategory] = useState("miscellaneous");

  async function fetchData() {
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
  }

  useEffect(() => {
    const fetchDataAsync = async () => {
      await fetchData();
    };
    fetchDataAsync();
  }, []);

  function openAdd() {
    setEditingReminder(null);
    setFormName("");
    setFormAmount("");
    setFormBillingType("monthly");
    setFormNextDate("");
    setFormAccountId(accounts[0]?.id || "");
    setFormCategory("miscellaneous");
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
  }

  async function handleDelete(id) {
    await supabase.from("subscription_reminders").delete().eq("id", id);
    fetchData();
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
              <div
                key={rem.id}
                className={`bg-white rounded-xl p-4 border shadow-sm ${pastDue ? "border-amber-400" : "border-slate-200"}`}
              >
                <div
                  className="flex items-start justify-between"
                  onClick={() => openEdit(rem)}
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
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                        {rem.billing_type === "monthly" ? "Monthly" : "Yearly"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rem.id);
                    }}
                    className="text-slate-400 active:text-rose-500 p-2 ml-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={openAdd}
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
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Account
            </label>
            <select
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
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
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
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
            onClick={handleSave}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90"
          >
            {editingReminder ? "Save Changes" : "Add Subscription"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
