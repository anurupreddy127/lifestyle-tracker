# App Flow — Personal Lifestyle Tracker

---

## Global Rules

- App opens **directly on the Gym tab**. No loading screen, no login, no splash.
- **Bottom tab bar is always visible** on every screen except during an active workout (it hides to give full screen space, but a "Finish Workout" button is always accessible).
- All navigation is either tab-based (bottom bar) or push/modal (within a tab).

---

## App Entry Point

```
App opens
  └── Gym Tab (default)
        └── Screen: Gym Home [GYM-1]
```

---

## GYM TAB FLOWS

---

### [GYM-1] Gym Home Screen

**Path:** `/gym`
**This is the default screen when the app opens.**

**What the user sees:**
- Header: "My Workouts"
- Scrollable list of all saved Days (e.g., "Push Day", "Pull Day", "Leg Day")
  - Each card shows: Day name + number of exercises
- Top-right icon button: Library (dumbbell icon) → navigates to [GYM-4]
- Bottom button: "+ Create New Day" → navigates to [GYM-3]

**User actions:**
| Action | Result |
|---|---|
| Tap a Day card | Navigate to [GYM-2] Active Workout |
| Tap Library icon | Navigate to [GYM-4] Exercise Library |
| Tap "+ Create New Day" | Navigate to [GYM-3] Day Builder |

---

### [GYM-2] Active Workout Screen

**Path:** `/gym/workout/[day_id]`
**Triggered by:** Tapping a Day card on [GYM-1]

**On screen load (data fetching):**
1. Fetch all exercises for this `day_id` from `day_exercises` (ordered by `sort_order`).
2. Find the most recent completed `workout_session` for this `day_id`.
3. Fetch all `workout_logs` from that previous session.
4. Match previous logs to current exercises by `exercise_id`.
5. Create a new `workout_session` row in the DB immediately (or on "Finish" — see note below).

**What the user sees:**
- Header: Day name (e.g., "Push Day")
- Scrollable list of Exercise Cards

**Each Exercise Card contains:**
| Element | Content | Style |
|---|---|---|
| Exercise Name | e.g., "Bench Press" | Large, white text |
| Target Guide | e.g., "4 sets × 8 reps" | Small, muted gray |
| Previous Session | e.g., "Last: 45 lbs/side · 6 reps" OR "No previous data" | Small, muted gray |
| Weight Input | Number field. Label = "lbs per side" (barbell_dumbbell) OR "Total lbs" (machine) | Full width input |
| Reps Input | Number field. Label = "Reps" | Full width input |

- Fixed bottom button: **"Finish Workout"**

**"Finish Workout" button behavior:**
1. Validate: every exercise card must have both a weight and reps value entered.
2. If validation fails: highlight the empty cards, do not proceed.
3. If validation passes:
   - Insert one `workout_sessions` row with `day_id` and `performed_at = now()`.
   - Insert one `workout_logs` row per exercise using the new `session_id`.
   - Show a success toast: "Workout saved! 💪"
   - Navigate back to [GYM-1].

**Note on session creation timing:** Create the `workout_session` row ONLY on "Finish Workout" — not on screen load. This prevents orphaned session rows if the user backs out.

---

### [GYM-3] Day Builder Screen

**Path:** `/gym/builder` (create) or `/gym/builder/[day_id]` (edit)
**Triggered by:** "+ Create New Day" button or editing an existing Day

**What the user sees:**
- Header: "Build Day" with a "Save" button (top right)
- Input field: Day name (e.g., "Push Day")
- List of exercises added so far (draggable to reorder)
  - Each row shows: Exercise name, target sets × reps, a delete (×) button
  - Each row is tappable to edit the target sets and reps for that exercise
- Bottom button: "+ Add Exercise" → opens the Exercise Picker (bottom sheet modal)

**Exercise Picker (bottom sheet):**
- Shows the full Exercise Library as a searchable list
- User taps an exercise to add it
- After tapping, a small prompt appears: "Set targets — Sets: [  ] Reps: [  ]" → user fills in and confirms
- Exercise is added to the bottom of the list

**"Save" button behavior:**
1. Validate: Day name must not be empty. At least 1 exercise must be added.
2. Insert/update `workout_days` row.
3. Delete old `day_exercises` rows for this day (if editing) and insert fresh ones with correct `sort_order`.
4. Navigate back to [GYM-1].

---

### [GYM-4] Exercise Library Screen

**Path:** `/gym/library`
**Triggered by:** Tapping the dumbbell icon on [GYM-1]

**What the user sees:**
- Header: "Exercise Library"
- Scrollable list of all exercises (sorted alphabetically)
  - Each row shows: Exercise name + equipment type badge (e.g., "Barbell/Dumbbell" or "Machine")
  - Swipe left or tap row → Edit / Delete options
- Bottom button: "+ Add Exercise" → opens Add Exercise modal

**Add / Edit Exercise modal:**
| Field | Input Type |
|---|---|
| Exercise Name | Text input |
| Equipment Type | Toggle/Segmented control: "Barbell / Dumbbell" or "Machine" |

**Save** → inserts or updates `exercises` row. Closes modal.
**Delete** → only allowed if the exercise is not referenced in any `day_exercises`. If it is, show a warning: "This exercise is used in [X] Day(s). Remove it from those Days first."

---

## FINANCE TAB FLOWS

---

### [FIN-1] Finance Home (Dashboard)

**Path:** `/finance`

**What the user sees:**
- Header: "Finance" + current month label (e.g., "July 2025")
- **Summary Cards row:**
  - Income: green, total income this month
  - Expenses: red, total expenses this month
  - Net: green or red depending on positive/negative
- **Account Balances section:**
  - Each account shown as a card: Name, Type badge, Balance
  - Checking/Cash/Savings balances: green text
  - Credit Card balances: red text (labeled "Owed")
- **Recent Transactions list:**
  - Last 20 transactions, sorted newest first
  - Each row: Date · Description/Category · Amount (colored by type) · Account name
- **Floating Action Button (FAB):** "+" button bottom right → opens [FIN-2] Add Transaction

**Top-right icon buttons:**
| Icon | Destination |
|---|---|
| Bank/Accounts icon | [FIN-3] Account Manager |
| Bell/Subscriptions icon | [FIN-4] Subscription Reminders |

---

### [FIN-2] Add Transaction Screen (Modal)

**Path:** Modal overlay (no URL change needed)
**Triggered by:** Tapping the "+" FAB on [FIN-1]

**What the user sees:**
- Three tabs at the top: **Expense** | **Income** | **Transfer**
- Form changes based on selected tab

**Tab: Expense**
| Field | Input | Required |
|---|---|---|
| Date | Date picker, defaults to today | Yes |
| Amount | Numeric keyboard, "$ " prefix | Yes |
| Account | Dropdown of all accounts | Yes |
| Category | Dropdown: Housing, Food, Electricity, Health, Shopping, Studying, Miscellaneous | Yes |
| Description | Text input | No |

**Tab: Income**
| Field | Input | Required |
|---|---|---|
| Date | Date picker, defaults to today | Yes |
| Amount | Numeric keyboard, "$ " prefix | Yes |
| Account | Dropdown of all accounts | Yes |
| Description | Text input | No |

**Tab: Transfer**
| Field | Input | Required |
|---|---|---|
| Date | Date picker, defaults to today | Yes |
| Amount | Numeric keyboard, "$ " prefix | Yes |
| From Account | Dropdown of all accounts | Yes |
| To Account | Dropdown of all accounts (excludes From Account) | Yes |
| Description | Text input | No |

**"Save" button behavior:**
1. Validate required fields.
2. Insert row into `transactions` table.
3. Database trigger automatically updates `accounts.balance`.
4. Close modal, return to [FIN-1] with updated data.

---

### [FIN-3] Account Manager Screen

**Path:** `/finance/accounts`

**What the user sees:**
- List of all accounts with name, type, and current balance
- Each account is tappable to edit the name (balance is never manually editable here)
- Bottom button: "+ Add Account" → opens Add Account modal

**Add Account modal:**
| Field | Input | Required |
|---|---|---|
| Account Name | Text input | Yes |
| Account Type | Segmented control: Checking / Credit Card / Cash / Savings | Yes |
| Starting Balance | Numeric input | Yes |

**Save** → inserts row into `accounts`. `balance` is set to `starting_balance` on creation.

---

### [FIN-4] Subscription Reminders Screen

**Path:** `/finance/subscriptions`

**What the user sees:**
- List of all subscription reminders, sorted by `next_billing_date` ascending (soonest first)
- Each card shows: Name, Amount, Next Due Date, Account name, Category
- A card with a due date of today or in the past is highlighted (e.g., orange border) as a visual cue to log it
- Tapping a card → Edit reminder
- Swipe left → Delete reminder
- Bottom button: "+ Add Subscription"

**Add / Edit Subscription modal:**
| Field | Input | Required |
|---|---|---|
| Name | Text input | Yes |
| Amount | Numeric input | Yes |
| Billing Type | Toggle: Monthly / Yearly | Yes |
| Next Billing Date | Date picker | Yes |
| Account | Dropdown of all accounts | Yes |
| Category | Dropdown of categories | Yes |

**Save** → inserts/updates `subscription_reminders`.

**No automation.** The user sees the reminder, opens Add Transaction ([FIN-2]), logs it as an Expense, and manually updates the `next_billing_date` on the reminder.
