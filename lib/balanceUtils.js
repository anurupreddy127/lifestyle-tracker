/**
 * Recalculate an account's balance from scratch using starting_balance
 * plus all transactions. This is atomic-safe — no matter how many times
 * it runs, the result is always correct.
 *
 * @param {object} supabase - Supabase client
 * @param {string} accountId - Account to recalculate
 */
export async function recalculateBalance(supabase, accountId) {
  const { data: account } = await supabase
    .from("accounts")
    .select("starting_balance, account_type, credit_limit")
    .eq("id", accountId)
    .single();
  if (!account) return;

  // Get all transactions where this account is the source
  const { data: asSource } = await supabase
    .from("transactions")
    .select("amount, transaction_type")
    .eq("account_id", accountId);

  // Get all transfers where this account is the destination
  const { data: asDest } = await supabase
    .from("transactions")
    .select("amount")
    .eq("to_account_id", accountId)
    .eq("transaction_type", "transfer");

  let computed = account.starting_balance || 0;

  if (account.account_type === "credit_card") {
    // Credit card: balance = amount OWED
    // Expenses/transfers OUT increase what you owe
    // Income/received/transfers IN decrease what you owe (payments)
    (asSource || []).forEach((tx) => {
      if (tx.transaction_type === "income" || tx.transaction_type === "received") {
        computed -= tx.amount;
      } else if (tx.transaction_type === "expense" || tx.transaction_type === "transfer") {
        computed += tx.amount;
      }
    });
    (asDest || []).forEach((tx) => {
      computed -= tx.amount;
    });
  } else {
    // Regular accounts: balance = money you HAVE
    (asSource || []).forEach((tx) => {
      if (tx.transaction_type === "income" || tx.transaction_type === "received") {
        computed += tx.amount;
      } else if (tx.transaction_type === "expense" || tx.transaction_type === "transfer") {
        computed -= tx.amount;
      }
    });
    (asDest || []).forEach((tx) => {
      computed += tx.amount;
    });
  }

  if (account.account_type === "credit_card") {
    const available = (account.credit_limit || 0) - computed;
    await supabase
      .from("accounts")
      .update({ balance: computed, available_credit: available })
      .eq("id", accountId);
  } else {
    await supabase
      .from("accounts")
      .update({ balance: computed })
      .eq("id", accountId);
  }
}
