import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Auth — validate API key from Authorization header
// ---------------------------------------------------------------------------
async function authenticateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid Authorization header" };
  }

  const rawKey = authHeader.slice(7);

  // SHA-256 hash the raw key
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: keyRow, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRow) {
    return { userId: null, error: "Invalid API key" };
  }

  return { userId: keyRow.user_id as string, error: null };
}

// ---------------------------------------------------------------------------
// Balance recalculation (same logic as lib/balanceUtils.js)
// ---------------------------------------------------------------------------
async function recalculateBalance(supabase: ReturnType<typeof createClient>, accountId: string) {
  const { data: account } = await supabase
    .from("accounts")
    .select("starting_balance, account_type, credit_limit")
    .eq("id", accountId)
    .single();

  if (!account) return;

  const { data: asSource } = await supabase
    .from("transactions")
    .select("amount, transaction_type")
    .eq("account_id", accountId);

  const { data: asDest } = await supabase
    .from("transactions")
    .select("amount")
    .eq("to_account_id", accountId)
    .eq("transaction_type", "transfer");

  let computed = account.starting_balance || 0;

  if (account.account_type === "credit_card") {
    // Credit card: balance = amount OWED
    (asSource || []).forEach((tx: { amount: number; transaction_type: string }) => {
      if (tx.transaction_type === "income" || tx.transaction_type === "received") {
        computed -= tx.amount;
      } else if (tx.transaction_type === "expense" || tx.transaction_type === "transfer") {
        computed += tx.amount;
      }
    });
    (asDest || []).forEach((tx: { amount: number }) => {
      computed -= tx.amount;
    });
  } else {
    // Regular accounts: balance = money you HAVE
    (asSource || []).forEach((tx: { amount: number; transaction_type: string }) => {
      if (tx.transaction_type === "income" || tx.transaction_type === "received") {
        computed += tx.amount;
      } else if (tx.transaction_type === "expense" || tx.transaction_type === "transfer") {
        computed -= tx.amount;
      }
    });
    (asDest || []).forEach((tx: { amount: number }) => {
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

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate
  const authHeader = req.headers.get("authorization");
  const { userId, error: authError } = await authenticateApiKey(authHeader);
  if (authError) {
    return jsonResponse({ error: authError }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // -----------------------------------------------------------------------
  // GET — return user's accounts + categories
  // -----------------------------------------------------------------------
  if (req.method === "GET") {
    const [accountsRes, categoriesRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, account_type")
        .eq("user_id", userId)
        .order("name"),
      supabase
        .from("categories")
        .select("name, emoji")
        .eq("user_id", userId)
        .order("created_at"),
    ]);

    return jsonResponse({
      accounts: accountsRes.data || [],
      categories: categoriesRes.data || [],
    });
  }

  // -----------------------------------------------------------------------
  // POST — create a transaction
  // -----------------------------------------------------------------------
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { type, amount, personal_amount, account, to_account, category, description, date } = body;

    // --- Validation ---
    if (!type || !amount || !account) {
      return jsonResponse({ error: "Missing required fields: type, amount, account" }, 400);
    }

    const validTypes = ["expense", "income", "received", "transfer"];
    if (!validTypes.includes(type)) {
      return jsonResponse({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, 400);
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return jsonResponse({ error: "Amount must be a positive number" }, 400);
    }

    // --- Resolve account name -> ID ---
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", account)
      .single();

    if (!accountRow) {
      return jsonResponse({ error: `Account "${account}" not found` }, 404);
    }

    // --- Resolve to_account for transfers ---
    let toAccountId: string | null = null;
    if (type === "transfer") {
      if (!to_account) {
        return jsonResponse({ error: "to_account is required for transfers" }, 400);
      }
      const { data: toAccountRow } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", to_account)
        .single();

      if (!toAccountRow) {
        return jsonResponse({ error: `To account "${to_account}" not found` }, 404);
      }
      toAccountId = toAccountRow.id;
    }

    // --- Build and insert transaction ---
    const txDate = date || new Date().toISOString().split("T")[0];
    const parsedPersonal = personal_amount ? parseFloat(personal_amount) : parsedAmount;

    const row = {
      user_id: userId,
      date: txDate,
      transaction_type: type,
      amount: parsedAmount,
      personal_amount: type === "expense" ? parsedPersonal : parsedAmount,
      account_id: accountRow.id,
      to_account_id: toAccountId,
      category: type === "expense" ? (category || null) : null,
      description: description || null,
    };

    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert(row)
      .select("*")
      .single();

    if (insertError) {
      return jsonResponse({ error: "Failed to create transaction: " + insertError.message }, 500);
    }

    // --- Recalculate balances ---
    await recalculateBalance(supabase, accountRow.id);
    if (toAccountId) {
      await recalculateBalance(supabase, toAccountId);
    }

    return jsonResponse({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        account,
        date: transaction.date,
        description: transaction.description,
      },
    });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});
