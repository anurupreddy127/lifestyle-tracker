# PRD — Personal Lifestyle Tracker (Gym & Finance)

---

## Project Metadata

| Field | Value |
|---|---|
| **App Name** | Personal Lifestyle Tracker |
| **Platform** | Mobile-First PWA (iOS primary, runs in Safari, added to Home Screen) |
| **Frontend** | Next.js (App Router) + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL) |
| **Target User** | Single user — personal deployment only |
| **Authentication** | None. No login screen. App opens directly to content. |

---

## 1. Overview

A personal mobile app to track two things: **gym workouts** and **personal finances**. The app is always-open — no login, no splash screen. It launches directly into the Gym tab because that is where immediate data entry happens most often.

---

## 2. Global Navigation

- A **persistent bottom tab bar** is always visible.
- Two tabs only: `Gym` (left, default) and `Finance` (right).
- The app **always launches on the Gym tab**, every time it opens.
- No other top-level navigation exists.

---

## 3. GYM TRACKER

### 3.0 Core Philosophy

- The gym module is built around **Days** (e.g., "Push", "Pull", "Legs").
- Each Day contains a list of exercises with a defined target (sets × reps).
- During a workout, you only **log the final (top) set** — not every set.
- The UI always shows what you did **last session** so you know the baseline to beat.

---

### 3.1 Exercise Library

The Exercise Library is a master list of all exercises you can use.

**Each exercise has:**
| Field | Description |
|---|---|
| `name` | e.g., "Barbell Back Squat", "Dumbbell Curl", "Leg Press" |
| `equipment_type` | Either `Barbell/Dumbbell` or `Machine` — no other options |

**Equipment type controls the weight input label during logging:**
| Equipment Type | Weight Input Label |
|---|---|
| `Barbell/Dumbbell` | "Weight per side (lbs)" — user enters weight for ONE side |
| `Machine` | "Total weight (lbs)" — user enters the full stack weight |

**Operations allowed:** Add new exercise, Edit name or equipment type, Delete exercise (only if not used in any Day).

---

### 3.2 Workout Days

A Day is a named workout routine. It is the top-level object the user selects to start a workout.

**Each Day has:**
| Field | Description |
|---|---|
| `name` | e.g., "Push Day", "Pull Day", "Leg Day" |
| `exercises` | An ordered list of exercises pulled from the Exercise Library |

**Each exercise within a Day also has:**
| Field | Description |
|---|---|
| `target_sets` | How many sets are planned (e.g., 4) |
| `target_reps` | How many reps per set are planned (e.g., 8) |
| `sort_order` | Integer. Controls the display order of exercises in the Day. |

**Operations allowed:** Create Day, Edit Day name, Add/Remove exercises from a Day, Reorder exercises within a Day, Delete Day.

---

### 3.3 Active Workout (Logging Flow)

This is the screen that opens when the user taps a Day to start training.

**Step 1 — User taps a Day from the home list.**
The Active Workout screen opens showing all exercises in that Day in order.

**Step 2 — For each Exercise Card, the UI displays:**
| Element | Description |
|---|---|
| Exercise name | e.g., "Bench Press" |
| Target sets × reps | e.g., "4 sets × 8 reps" (read-only guide) |
| Previous session data | e.g., "Last: 45 lbs per side / 6 reps" (read-only, muted text) |
| Weight input | Labeled per equipment type (per side OR total) |
| Reps input | How many reps the user completed on the final set |

**"Previous session" definition:** The weight and reps logged the **last time this specific Day was completed**. If the Day has never been done before, display "No previous data."

**Step 3 — User taps "Finish Workout".**
- All entered values are saved to the database as one grouped session.
- A success confirmation (toast/snack) is shown.
- User is returned to the Gym home screen.

**Rules:**
- Only the final set's weight and reps are saved per exercise. Target sets/reps are display-only.
- Every exercise in the Day must have a value entered before "Finish Workout" is allowed. (Or: user can skip an exercise explicitly.)
- Warm-ups, rest timers, intermediate sets — all out of scope.

---

### 3.4 Gym Home Screen

- Displays a scrollable list of all saved Days.
- Each Day shows as a card with its name and number of exercises.
- Tapping a card starts the Active Workout for that Day.
- A button to access the Exercise Library (manage exercises).
- A button to create a new Day.

---

## 4. FINANCE TRACKER

### 4.0 Core Philosophy

- Track all money movement across multiple accounts.
- Dashboard shows the **current calendar month** totals.
- Everything is logged manually — no automatic transactions of any kind.
- Subscriptions exist only as **reminders** — the user logs the actual expense themselves.

---

### 4.1 Accounts

Accounts represent your real-world financial accounts or wallets.

**Each account has:**
| Field | Description |
|---|---|
| `name` | e.g., "Chase Checking", "Amex Gold", "Wallet Cash", "HYSA Savings" |
| `account_type` | One of: `Checking`, `Credit Card`, `Cash`, `Savings` |
| `starting_balance` | Required on creation. The balance at the time of setup. |
| `current_balance` | Live value. Auto-updated by the database trigger on every transaction. |

**Account type display rules:**
| Account Type | Balance Display |
|---|---|
| `Checking` | Positive = green. Shown as funds available. |
| `Cash` | Positive = green. Shown as funds available. |
| `Savings` | Positive = green. Shown as funds available. |
| `Credit Card` | Balance shown in red as a debt (amount owed). |

**Operations allowed:** Add account, Edit account name, View account balance. (Deletion out of scope for v1.)

---

### 4.2 Transaction Types

There are exactly **three transaction types**. Every money movement falls into one of these.

---

#### TYPE 1: Expense
Money leaving an account for something you bought or paid for.

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Defaults to today |
| Amount | Yes | Positive number |
| Account | Yes | Which account the money came from |
| Category | Yes | See Section 4.3 |
| Description | No | Optional free-text note |

**Account balance effect:** `account.balance -= amount`

---

#### TYPE 2: Income
Money received and deposited into an account.

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Defaults to today |
| Amount | Yes | Positive number |
| Account | Yes | Which account received the money |
| Description | No | Optional free-text note |

**Account balance effect:** `account.balance += amount`

**Note:** Income has no category. It is always classified as income.

---

#### TYPE 3: Transfer
Money moving between two of your own accounts. Also used for credit card payments.

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Defaults to today |
| Amount | Yes | Positive number |
| From Account | Yes | The account losing money |
| To Account | Yes | The account gaining money |
| Description | No | Optional free-text note |

**Account balance effect:** `from_account.balance -= amount` AND `to_account.balance += amount`

**Common use cases:**
- Paying off a credit card: From = Checking, To = Amex Credit Card
- Moving money to savings: From = Checking, To = HYSA Savings
- Withdrawing cash: From = Checking, To = Wallet Cash

---

### 4.3 Expense Categories

Fixed list. Cannot be added to or changed by the user. Used only on Expense transactions.

| Category | When to use |
|---|---|
| `Housing` | Rent, utilities, maintenance |
| `Food` | Groceries, restaurants, coffee |
| `Electricity` | Electric bill |
| `Health` | Medical, pharmacy, gym membership |
| `Shopping` | Clothing, electronics, household items |
| `Studying` | Tuition, books, courses, supplies |
| `Miscellaneous` | Anything that doesn't fit above |

**Savings is NOT a category.** Savings is an account type. To add money to savings, use a Transfer transaction.

---

### 4.4 Savings Flow (Detailed)

This is how savings works end-to-end:

| Action | Transaction Type | From | To | Category |
|---|---|---|---|---|
| Move money into savings | Transfer | Checking | Savings Account | — |
| Spend from savings account | Expense | Savings Account | — | Appropriate category (Food, Health, etc.) |
| Move savings back to checking | Transfer | Savings Account | Checking | — |

The **Savings balance on the dashboard** is simply the live `current_balance` of whichever account has `account_type = Savings`.

---

### 4.5 Finance Dashboard

Displays a summary of financial activity for the **current calendar month** (Month 1–today).

**Top-Level Metric Cards:**
| Metric | How It's Calculated |
|---|---|
| Total Income | Sum of all Income transactions this month |
| Total Expenses | Sum of all Expense transactions this month |
| Net (Income − Expenses) | Calculated field, not stored |

**Account Balances Section:**
- Shows every account with its live `current_balance`.
- Checking/Cash/Savings displayed in green (positive balance).
- Credit Cards displayed in red (balance = amount owed).

**Recent Transactions:**
- A scrollable list of the most recent transactions (all types) with date, description, amount, and type indicator.

---

### 4.6 Subscription Reminders

Subscriptions are **reminders only**. They do NOT auto-create transactions. The user sees them and logs the expense manually when the bill comes.

**Each subscription reminder has:**
| Field | Description |
|---|---|
| `name` | e.g., "Netflix", "Spotify", "Gym Membership" |
| `amount` | Expected charge amount |
| `billing_type` | `Monthly` or `Yearly` |
| `next_billing_date` | The upcoming due date |
| `account` | Which account it usually charges to |
| `category` | Which expense category it falls under |

**Operations:** Add reminder, Edit reminder, Delete reminder.
**No automation.** User manually logs the expense when it actually hits.

---

## 5. Out of Scope (v1.0)

The following will NOT be built in this version:

| Feature | Reason |
|---|---|
| User login / authentication | Single-user personal app |
| Multi-user support | Not needed |
| Automatic transaction creation (pg_cron, cron jobs) | All transactions logged manually |
| Bank API integrations (Plaid, etc.) | Out of scope |
| Charts, graphs, data exports | Out of scope |
| Gym rest timers | Out of scope |
| Warm-up set logging | Only top set is logged |
| Deleting accounts | Out of scope for v1 |
| Editing past transactions | Out of scope for v1 |
