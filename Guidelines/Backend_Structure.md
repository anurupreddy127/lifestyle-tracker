# Backend Structure — Personal Lifestyle Tracker

---

## Project Metadata

| Field | Value |
|---|---|
| **Database** | Supabase (PostgreSQL) |
| **Architecture** | Single-user. Row Level Security (RLS) is DISABLED. No user_id column needed anywhere. |
| **Automation** | One database trigger only (balance updates). No cron jobs. No edge functions. |

---

## 1. GYM TRACKER SCHEMA

---

### Table: `exercises`

The master list of all exercises available to add to any Day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `name` | `text` | NOT NULL | e.g., "Barbell Back Squat", "Leg Press" |
| `equipment_type` | `text` | NOT NULL, CHECK IN (`'barbell_dumbbell'`, `'machine'`) | Controls weight input label in UI |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

**Notes:**
- `equipment_type = 'barbell_dumbbell'` → UI shows "Weight per side (lbs)"
- `equipment_type = 'machine'` → UI shows "Total weight (lbs)"
- Do NOT delete an exercise if it is referenced in `day_exercises` or `workout_logs`.

---

### Table: `workout_days`

The named workout routines (previously called "templates" in v0 docs — now called Days).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `name` | `text` | NOT NULL | e.g., "Push Day", "Pull Day", "Leg Day" |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

---

### Table: `day_exercises`

Junction table. Links exercises to a specific Day and stores the training targets for that exercise within that Day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `day_id` | `uuid` | NOT NULL, FK → `workout_days.id` ON DELETE CASCADE | Which Day this belongs to |
| `exercise_id` | `uuid` | NOT NULL, FK → `exercises.id` | Which exercise |
| `target_sets` | `integer` | NOT NULL | Planned number of sets (display only, e.g., 4) |
| `target_reps` | `integer` | NOT NULL | Planned reps per set (display only, e.g., 8) |
| `sort_order` | `integer` | NOT NULL | Controls display order within the Day. Lower = first. |

**Notes:**
- `target_sets` and `target_reps` are **display guides only**. They are never logged.
- UNIQUE constraint on `(day_id, exercise_id)` — an exercise cannot appear twice in the same Day.

---

### Table: `workout_sessions`

Represents one complete workout event. Groups all exercise logs from a single gym visit together.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `day_id` | `uuid` | NOT NULL, FK → `workout_days.id` | Which Day was performed |
| `performed_at` | `timestamptz` | NOT NULL, default `now()` | When the workout was done |

**Why this table exists:** Without sessions, querying "previous session" data is ambiguous when the same Day is done multiple times in a week. All logs share a `session_id`, so "previous session" always means the last complete gym visit for that Day.

---

### Table: `workout_logs`

The actual logged data. One row per exercise per session. Only the final (top) set is stored.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `session_id` | `uuid` | NOT NULL, FK → `workout_sessions.id` ON DELETE CASCADE | Which session this belongs to |
| `exercise_id` | `uuid` | NOT NULL, FK → `exercises.id` | Which exercise was logged |
| `weight` | `numeric` | NOT NULL | The weight entered by the user |
| `weight_type` | `text` | NOT NULL, CHECK IN (`'per_side'`, `'total'`) | Mirrors equipment_type for clarity |
| `reps` | `integer` | NOT NULL | Reps completed on the final set |

**Notes:**
- One row per exercise per session. Never more.
- UNIQUE constraint on `(session_id, exercise_id)`.

---

### Gym: "Previous Session" Query Logic

When loading the Active Workout screen for a given `day_id`:

```sql
-- For each exercise in the Day, get the log from the most recent prior session
SELECT
  wl.exercise_id,
  wl.weight,
  wl.weight_type,
  wl.reps,
  ws.performed_at
FROM workout_logs wl
JOIN workout_sessions ws ON wl.session_id = ws.id
WHERE ws.day_id = :current_day_id
  AND ws.id != :current_session_id  -- exclude the current in-progress session
ORDER BY ws.performed_at DESC
LIMIT 1 per exercise_id  -- use DISTINCT ON (wl.exercise_id) in PostgreSQL
```

**In Supabase (JavaScript):**
```js
// Get the last session for this day (excluding current)
const { data: lastSession } = await supabase
  .from('workout_sessions')
  .select('id')
  .eq('day_id', dayId)
  .order('performed_at', { ascending: false })
  .limit(1)
  .single()

// Then get logs for that session
const { data: previousLogs } = await supabase
  .from('workout_logs')
  .select('exercise_id, weight, weight_type, reps')
  .eq('session_id', lastSession.id)
```

---

## 2. FINANCE TRACKER SCHEMA

---

### Table: `accounts`

Your real-world accounts and wallets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `name` | `text` | NOT NULL | e.g., "Chase Checking", "Amex Gold", "HYSA Savings" |
| `account_type` | `text` | NOT NULL, CHECK IN (`'checking'`, `'credit_card'`, `'cash'`, `'savings'`) | Controls balance display in UI |
| `starting_balance` | `numeric` | NOT NULL | Balance at the time the account was added to the app |
| `balance` | `numeric` | NOT NULL, default = `starting_balance` | Live running balance. Updated automatically by trigger on every transaction. |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

**UI display rules:**
- `checking`, `cash`, `savings` → balance shown in green (funds available)
- `credit_card` → balance shown in red (amount owed / debt)

---

### Table: `transactions`

The master ledger. Every money movement — expense, income, or transfer — is one row here.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `transaction_type` | `text` | NOT NULL, CHECK IN (`'expense'`, `'income'`, `'transfer'`) | Determines logic and UI display |
| `amount` | `numeric` | NOT NULL, CHECK > 0 | Always a positive number |
| `date` | `date` | NOT NULL, default `current_date` | The date of the transaction |
| `account_id` | `uuid` | NOT NULL, FK → `accounts.id` | Primary account. For expense/income: the account used. For transfer: the FROM account. |
| `to_account_id` | `uuid` | nullable, FK → `accounts.id` | Only populated for `transfer` type. The TO account. |
| `category` | `text` | nullable, CHECK IN category list below | Required for `expense`. NULL for `income` and `transfer`. |
| `description` | `text` | nullable | Optional free-text note for any transaction type |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Record creation timestamp |

**Valid category values (for `expense` only):**
`'housing'`, `'food'`, `'electricity'`, `'health'`, `'shopping'`, `'studying'`, `'miscellaneous'`

**Validation rules to enforce:**
- If `transaction_type = 'expense'`: `category` must NOT be null, `to_account_id` must be null.
- If `transaction_type = 'income'`: `category` must be null, `to_account_id` must be null.
- If `transaction_type = 'transfer'`: `category` must be null, `to_account_id` must NOT be null, `to_account_id` must NOT equal `account_id`.

---

### Table: `subscription_reminders`

Reminders for recurring bills. Does NOT auto-create transactions. The user reads these and logs the expense manually.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Unique identifier |
| `name` | `text` | NOT NULL | e.g., "Netflix", "Spotify", "Gym Membership" |
| `amount` | `numeric` | NOT NULL | Expected charge amount |
| `billing_type` | `text` | NOT NULL, CHECK IN (`'monthly'`, `'yearly'`) | Frequency |
| `next_billing_date` | `date` | NOT NULL | The upcoming due date (user updates this manually after paying) |
| `account_id` | `uuid` | NOT NULL, FK → `accounts.id` | Which account it usually charges to |
| `category` | `text` | NOT NULL, CHECK IN category list | Expense category for reference when logging |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

---

## 3. DATABASE TRIGGER — Auto-Update Account Balances

This is the **only** automated logic in the backend. Every time a row is inserted into `transactions`, a trigger fires and updates the relevant account balance(s).

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'expense' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;

  ELSIF NEW.transaction_type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;

  ELSIF NEW.transaction_type = 'transfer' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger Declaration

```sql
CREATE TRIGGER on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();
```

**Important:**
- This trigger fires on INSERT only. There is no edit or delete of transactions in v1.
- The trigger is the single source of truth for balance updates. Never manually update `accounts.balance` from the frontend.

---

## 4. FINANCE DASHBOARD QUERY LOGIC

### Monthly Totals

```sql
-- Total Income this calendar month
SELECT COALESCE(SUM(amount), 0) AS total_income
FROM transactions
WHERE transaction_type = 'income'
  AND date >= date_trunc('month', current_date)
  AND date <= current_date;

-- Total Expenses this calendar month
SELECT COALESCE(SUM(amount), 0) AS total_expenses
FROM transactions
WHERE transaction_type = 'expense'
  AND date >= date_trunc('month', current_date)
  AND date <= current_date;
```

### Live Account Balances

```sql
SELECT id, name, account_type, balance
FROM accounts
ORDER BY created_at ASC;
```

**Net is calculated in the frontend:** `net = total_income - total_expenses`

---

## 5. SUPABASE CLIENT SETUP

File: `/utils/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**RLS:** Disabled on all tables. This is a single-user personal app. The anon key has full read/write access.
