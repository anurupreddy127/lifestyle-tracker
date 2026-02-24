# Implementation Plan — Personal Lifestyle Tracker

---

## Overview

Build order is strictly sequential. Each phase must be complete and tested before moving to the next. Do not start Phase 3 until Phase 2 is verified working.

| Phase | What Gets Built | Dependency |
|---|---|---|
| 1 | Project setup + PWA shell | None |
| 2 | Supabase backend (all tables + trigger) | Phase 1 |
| 3 | Gym Tracker (full flow) | Phase 2 |
| 4 | Finance Tracker (full flow) | Phase 2 |
| 5 | Polish + edge cases | Phases 3 & 4 |

---

## Phase 1 — Project Setup & PWA Shell

**Goal:** The app runs on your iPhone as a standalone app with correct navigation and no content yet.

---

### Step 1.1 — Initialize Next.js Project

```bash
npx create-next-app@latest lifestyle-tracker
```
Select: **TypeScript → No** (use plain JS), **Tailwind → Yes**, **App Router → Yes**, **src/ directory → No**.

---

### Step 1.2 — Install Dependencies

```bash
npm install @supabase/supabase-js lucide-react
```

No other dependencies needed. Do NOT install any UI component library — everything is built with Tailwind from scratch.

---

### Step 1.3 — Configure PWA Globals

**File: `app/globals.css`** — Add these rules to the `body`:
```css
body {
  user-select: none;
  -webkit-user-select: none;
  overscroll-behavior-y: none;
}
```

---

### Step 1.4 — Create PWA Manifest

**File: `public/manifest.json`**
```json
{
  "name": "Lifestyle Tracker",
  "short_name": "Tracker",
  "display": "standalone",
  "background_color": "#020617",
  "theme_color": "#020617",
  "start_url": "/gym"
}
```

---

### Step 1.5 — Root Layout

**File: `app/layout.jsx`**
- Set `bg-slate-950` on body
- Add `select-none` and `overscroll-none` Tailwind classes
- Add iOS safe area padding
- Render `<BottomNav />` component
- Link the manifest and Apple meta tags

---

### Step 1.6 — Build BottomNav Component

**File: `components/BottomNav.jsx`**
- Two tabs: Gym (`/gym`) and Finance (`/finance`)
- Dumbbell icon for Gym, Wallet icon for Finance
- Active tab detection using `usePathname()`
- Fixed to bottom with safe area padding
- See Frontend Guidelines Section 3.1 for exact code

---

### Step 1.7 — Create Placeholder Screens

Create these files with a simple "Coming Soon" heading so routing works:
- `app/gym/page.jsx` → "Gym Home"
- `app/finance/page.jsx` → "Finance Home"

---

### Step 1.8 — Deploy & Test on iPhone

1. Push to GitHub.
2. Deploy to Vercel (connect repo, zero config needed).
3. Open the Vercel URL in **Safari on iPhone**.
4. Tap **Share → Add to Home Screen**.
5. Open from Home Screen.

**Verify:**
- [ ] No Safari URL bar visible (standalone mode working)
- [ ] Bottom nav shows both tabs
- [ ] Tapping tabs switches between Gym and Finance
- [ ] No text highlights when tapping rapidly
- [ ] No bounce when scrolling at top

**Do not proceed to Phase 2 until all 5 checks pass.**

---

## Phase 2 — Supabase Backend

**Goal:** All tables exist, the balance trigger works, and the Next.js app can read/write data.

---

### Step 2.1 — Create Supabase Project

1. Go to supabase.com → New Project
2. Note down: **Project URL** and **anon public key**
3. Go to **Settings → API** to find these values

---

### Step 2.2 — Disable Row Level Security

In Supabase SQL editor, run:
```sql
-- Run for every table after creating it
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE day_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_reminders DISABLE ROW LEVEL SECURITY;
```

---

### Step 2.3 — Create Gym Tables

Run in Supabase SQL Editor:

```sql
-- Exercises (master list)
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  equipment_type text NOT NULL CHECK (equipment_type IN ('barbell_dumbbell', 'machine')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workout Days (named routines)
CREATE TABLE workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Day Exercises (junction table with targets)
CREATE TABLE day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  target_sets integer NOT NULL,
  target_reps integer NOT NULL,
  sort_order integer NOT NULL,
  UNIQUE(day_id, exercise_id)
);

-- Workout Sessions (groups a single gym visit)
CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES workout_days(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- Workout Logs (one row per exercise per session — top set only)
CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  weight numeric NOT NULL,
  weight_type text NOT NULL CHECK (weight_type IN ('per_side', 'total')),
  reps integer NOT NULL,
  UNIQUE(session_id, exercise_id)
);
```

**Verify:** Check that all 5 tables appear in the Table Editor.

---

### Step 2.4 — Create Finance Tables

```sql
-- Accounts
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking', 'credit_card', 'cash', 'savings')),
  starting_balance numeric NOT NULL,
  balance numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Transactions (master ledger)
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
  amount numeric NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT current_date,
  account_id uuid NOT NULL REFERENCES accounts(id),
  to_account_id uuid REFERENCES accounts(id),
  category text CHECK (category IN ('housing', 'food', 'electricity', 'health', 'shopping', 'studying', 'miscellaneous')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription Reminders (display only — no automation)
CREATE TABLE subscription_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('monthly', 'yearly')),
  next_billing_date date NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts(id),
  category text NOT NULL CHECK (category IN ('housing', 'food', 'electricity', 'health', 'shopping', 'studying', 'miscellaneous')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### Step 2.5 — Create Balance Trigger

```sql
-- Trigger function
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

-- Attach trigger to transactions table
CREATE TRIGGER on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();
```

**Test the trigger manually:**
```sql
-- 1. Create a test account
INSERT INTO accounts (name, account_type, starting_balance, balance) 
VALUES ('Test Checking', 'checking', 1000, 1000);

-- 2. Add an expense
INSERT INTO transactions (transaction_type, amount, account_id, category)
VALUES ('expense', 50, '<account_id_from_step_1>', 'food');

-- 3. Check that balance is now 950
SELECT balance FROM accounts WHERE name = 'Test Checking';
-- Expected: 950

-- 4. Clean up test data
DELETE FROM transactions WHERE description IS NULL AND category = 'food';
DELETE FROM accounts WHERE name = 'Test Checking';
```

---

### Step 2.6 — Connect Next.js to Supabase

**File: `.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**File: `utils/supabase.js`**
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Test the connection:** Add a temporary `console.log` to fetch all exercises and confirm the response is an empty array (not an error).

---

## Phase 3 — Gym Tracker Build

**Goal:** Complete gym flow works — create days, add exercises, do a workout, see previous session data.

Build in this exact order:

---

### Step 3.1 — Exercise Library (`/gym/library`)

1. Fetch and display all exercises from the `exercises` table.
2. Build the Add/Edit modal with name input and equipment type toggle.
3. On save: insert into `exercises`, refresh the list.
4. On delete: check if exercise is in `day_exercises`. If yes, block deletion with error message.

**Verify:** Add 3 exercises (1 barbell_dumbbell, 2 machine). Confirm they appear in the list.

---

### Step 3.2 — Day Builder (`/gym/builder`)

1. Build the Day name input.
2. Build the "+ Add Exercise" bottom sheet (searchable list from `exercises` table).
3. On exercise tap: show Sets/Reps input prompt, then add to list.
4. Implement drag-to-reorder (or up/down arrows as simpler alternative).
5. On save:
   - Insert row into `workout_days`
   - Insert rows into `day_exercises` with correct `sort_order`
6. Navigate back to Gym Home.

**Verify:** Create a "Push Day" with 3 exercises. Confirm it appears on Gym Home.

---

### Step 3.3 — Gym Home (`/gym`)

1. Fetch all `workout_days` from DB.
2. Display as scrollable card list with name + exercise count.
3. Wire Library icon → `/gym/library`
4. Wire "+ Create New Day" → `/gym/builder`
5. Wire tapping a Day card → `/gym/workout/[day_id]`

**Verify:** Gym Home shows days, navigation to all 3 screens works.

---

### Step 3.4 — Active Workout (`/gym/workout/[day_id]`)

This is the most complex screen. Build it in sub-steps:

**3.4a — Load exercises for the Day:**
```js
const { data: dayExercises } = await supabase
  .from('day_exercises')
  .select('*, exercises(*)')
  .eq('day_id', dayId)
  .order('sort_order')
```

**3.4b — Load previous session data:**
```js
// Get most recent session for this day
const { data: lastSession } = await supabase
  .from('workout_sessions')
  .select('id')
  .eq('day_id', dayId)
  .order('performed_at', { ascending: false })
  .limit(1)
  .single()

// Get logs from that session (if it exists)
let previousLogs = []
if (lastSession) {
  const { data } = await supabase
    .from('workout_logs')
    .select('exercise_id, weight, weight_type, reps')
    .eq('session_id', lastSession.id)
  previousLogs = data
}
```

**3.4c — Build Exercise Cards:**
- Each card: exercise name, `target_sets × target_reps` (from `day_exercises`), previous log data (matched by `exercise_id`), weight input, reps input.
- Weight input label: "lbs per side" if `equipment_type = 'barbell_dumbbell'`, "Total lbs" if `machine`.

**3.4d — "Finish Workout" button:**
```js
// 1. Validate all inputs are filled
// 2. Create session
const { data: newSession } = await supabase
  .from('workout_sessions')
  .insert({ day_id: dayId })
  .select()
  .single()

// 3. Insert all logs
const logs = exercises.map(ex => ({
  session_id: newSession.id,
  exercise_id: ex.exercise_id,
  weight: inputValues[ex.exercise_id].weight,
  weight_type: ex.exercises.equipment_type === 'barbell_dumbbell' ? 'per_side' : 'total',
  reps: inputValues[ex.exercise_id].reps,
}))

await supabase.from('workout_logs').insert(logs)

// 4. Show toast, navigate back
```

**Verify:**
- [ ] Do a full workout, finish it.
- [ ] Go back and start the same day again.
- [ ] Confirm all exercise cards show the previous session data correctly.

---

## Phase 4 — Finance Tracker Build

**Goal:** Complete finance flow works — accounts, all 3 transaction types, dashboard totals, subscription reminders.

---

### Step 4.1 — Account Manager (`/finance/accounts`)

1. Fetch and display all accounts with name, type, balance.
2. Build Add Account modal (name, type selector, starting balance input).
3. On save: insert into `accounts` with `balance = starting_balance`.

**Verify:** Add a Checking account ($2000), a Savings account ($500), and a Credit Card ($0). Confirm all 3 appear with correct colors.

---

### Step 4.2 — Add Transaction Modal

1. Build 3-tab modal (Expense / Income / Transfer).
2. Each tab renders its specific form fields (see App Flow Section [FIN-2]).
3. Category dropdown only appears on Expense tab. Uses the 7 fixed categories.
4. Account dropdowns pull from `accounts` table.
5. On save: insert into `transactions` table.
6. Verify the DB trigger fires by immediately checking account balances after save.

**Verify:**
- Log $50 Food expense from Checking. Checking balance goes from $2000 → $1950. ✓
- Log $1000 income to Checking. Balance goes $1950 → $2950. ✓
- Transfer $200 from Checking to Savings. Checking: $2750, Savings: $700. ✓

---

### Step 4.3 — Finance Dashboard (`/finance`)

1. Query total income this calendar month.
2. Query total expenses this calendar month.
3. Calculate net in the frontend.
4. Display all account balances.
5. Display recent transactions list (last 20, all types).
6. Wire the "+" FAB to open the Add Transaction modal.
7. Wire the accounts icon → `/finance/accounts`
8. Wire the subscriptions icon → `/finance/subscriptions`

---

### Step 4.4 — Subscription Reminders (`/finance/subscriptions`)

1. Fetch all reminders sorted by `next_billing_date` ascending.
2. Highlight any with `next_billing_date <= today` in amber.
3. Build Add/Edit reminder modal with all fields.
4. On save: insert/update `subscription_reminders`.
5. No automation. Just display.

---

## Phase 5 — Polish & Edge Cases

**Goal:** The app is production-ready for daily personal use.

### Step 5.1 — Loading States
Add `animate-pulse` skeleton placeholders on every screen that fetches data. The user should never see a blank white screen.

### Step 5.2 — Empty States
Add friendly empty state messages for:
- Gym Home: no days yet
- Exercise Library: no exercises yet
- Finance Dashboard: no transactions this month
- Subscription Reminders: no reminders

### Step 5.3 — Input Validation
Verify all forms show clear inline errors when:
- Required fields are empty
- Amount is zero or negative
- Transfer: From Account = To Account
- Active Workout: weight or reps is missing on any exercise

### Step 5.4 — Vercel Environment Variables
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings before final deploy.

### Step 5.5 — Final Device Test
Test the complete app on iPhone:
- [ ] Open from Home Screen (standalone mode)
- [ ] Do a full gym workout start to finish
- [ ] Check previous session shows correctly on second attempt
- [ ] Log one of each transaction type, verify balances update
- [ ] Verify dashboard month totals are correct
- [ ] Add a subscription reminder, verify past-due highlighting
