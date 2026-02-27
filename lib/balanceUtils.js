/**
 * Adjust an account's balance after a transaction operation.
 *
 * @param {object} supabase - Supabase client
 * @param {string} accountId - Account to adjust
 * @param {number} amount - Transaction amount (positive)
 * @param {"debit"|"credit"} direction
 *   "debit"  = account loses money (expense, transfer-out)
 *   "credit" = account gains money (income, transfer-in, payment)
 */
export async function adjustBalance(supabase, accountId, amount, direction) {
  const { data: account } = await supabase
    .from("accounts")
    .select("account_type, balance, credit_limit, available_credit")
    .eq("id", accountId)
    .single();
  if (!account) return;

  const delta = direction === "credit" ? amount : -amount;

  if (account.account_type === "credit_card") {
    const newAvailable = (account.available_credit || 0) + delta;
    await supabase
      .from("accounts")
      .update({
        available_credit: newAvailable,
        balance: (account.credit_limit || 0) - newAvailable,
      })
      .eq("id", accountId);
  } else {
    await supabase
      .from("accounts")
      .update({
        balance: (account.balance || 0) + delta,
      })
      .eq("id", accountId);
  }
}
