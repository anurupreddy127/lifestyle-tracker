import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useSubscriptionForm(accounts, categories, onUpdate) {
  const { supabase, user } = useAuth();
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [subFormName, setSubFormName] = useState("");
  const [subFormAmount, setSubFormAmount] = useState("");
  const [subFormBillingType, setSubFormBillingType] = useState("monthly");
  const [subFormNextDate, setSubFormNextDate] = useState("");
  const [subFormAccountId, setSubFormAccountId] = useState("");
  const [subFormCategory, setSubFormCategory] = useState("");

  function resetForm() {
    setEditingSubscription(null);
    setSubFormName("");
    setSubFormAmount("");
    setSubFormBillingType("monthly");
    setSubFormNextDate("");
    setSubFormAccountId(accounts[0]?.id || "");
    setSubFormCategory(categories[categories.length - 1]?.name || "");
  }

  function openNewSubForm() {
    resetForm();
    setShowSubForm(true);
  }

  function openSubEdit(sub) {
    setEditingSubscription(sub);
    setSubFormName(sub.name);
    setSubFormAmount(String(sub.amount));
    setSubFormBillingType(sub.billing_type);
    setSubFormNextDate(sub.next_billing_date);
    setSubFormAccountId(sub.account_id);
    setSubFormCategory(sub.category);
    setShowSubForm(true);
  }

  function closeSubForm() {
    setShowSubForm(false);
    setEditingSubscription(null);
  }

  async function refreshSubscriptions() {
    const { data } = await supabase
      .from("subscription_reminders")
      .select("*, accounts(name)")
      .order("next_billing_date", { ascending: true });
    onUpdate(data || []);
  }

  async function handleSubSave() {
    if (!subFormName.trim() || !subFormAmount || !subFormNextDate || !subFormAccountId || !subFormCategory) return;

    try {
      const row = {
        name: subFormName.trim(),
        amount: parseFloat(subFormAmount),
        billing_type: subFormBillingType,
        next_billing_date: subFormNextDate,
        account_id: subFormAccountId,
        category: subFormCategory,
      };

      if (editingSubscription) {
        await supabase.from("subscription_reminders").update(row).eq("id", editingSubscription.id);
      } else {
        await supabase.from("subscription_reminders").insert({ ...row, user_id: user.id });
      }

      setShowSubForm(false);
      resetForm();
      await refreshSubscriptions();
    } catch {
      // Silent fail
    }
  }

  async function handleSubDelete(subId, setSubscriptions) {
    try {
      await supabase.from("subscription_reminders").delete().eq("id", subId);
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    } catch {
      // Silent fail
    }
  }

  return {
    showSubForm,
    editingSubscription,
    subFormName, setSubFormName,
    subFormAmount, setSubFormAmount,
    subFormBillingType, setSubFormBillingType,
    subFormNextDate, setSubFormNextDate,
    subFormAccountId, setSubFormAccountId,
    subFormCategory, setSubFormCategory,
    openNewSubForm,
    openSubEdit,
    closeSubForm,
    handleSubSave,
    handleSubDelete,
  };
}
