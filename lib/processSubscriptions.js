import { recalculateBalance } from "./balanceUtils";

/**
 * Advance a date by one billing period (month or year).
 * Keeps the same day-of-month, clamping to month end if needed.
 */
function advanceDate(dateStr, billingType) {
  const d = new Date(dateStr + "T00:00:00");
  if (billingType === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    const targetDay = d.getDate();
    d.setMonth(d.getMonth() + 1, 1); // go to 1st of next month
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(targetDay, maxDay));
  }
  return d.toISOString().split("T")[0];
}

/**
 * Process all due subscriptions for the current user.
 * Creates expense transactions for each missed billing date and
 * advances next_billing_date until it's in the future.
 *
 * Safe to call multiple times — once dates are advanced, they won't re-process.
 */
export async function processSubscriptions(supabase, userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: dueSubs } = await supabase
    .from("subscription_reminders")
    .select("*")
    .lte("next_billing_date", today);

  if (!dueSubs || dueSubs.length === 0) return [];

  const processed = [];
  const accountsToRecalc = new Set();

  for (const sub of dueSubs) {
    let billingDate = sub.next_billing_date;

    // Process each missed billing period
    while (billingDate <= today) {
      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        transaction_type: "expense",
        amount: sub.amount,
        personal_amount: sub.amount,
        date: billingDate,
        account_id: sub.account_id,
        category: sub.category,
        description: sub.name,
      });

      if (error) break;

      accountsToRecalc.add(sub.account_id);
      processed.push({ name: sub.name, date: billingDate, amount: sub.amount });
      billingDate = advanceDate(billingDate, sub.billing_type);
    }

    // Advance the subscription's next billing date
    await supabase
      .from("subscription_reminders")
      .update({ next_billing_date: billingDate })
      .eq("id", sub.id);
  }

  // Recalculate all affected account balances
  await Promise.all(
    [...accountsToRecalc].map((id) => recalculateBalance(supabase, id))
  );

  return processed;
}
