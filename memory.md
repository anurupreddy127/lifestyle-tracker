# Lifestyle Tracker - Project Memory

## Overview

**Lifestyle Tracker** is a mobile-first Progressive Web App (PWA) for personal gym and finance tracking. It has two workspaces — **Gym** and **Finance** — accessible from a hub landing page. Built with Next.js App Router, Supabase (auth + database), and Tailwind CSS v4. Designed primarily for iPhone/iOS Safari standalone mode.

---

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 16.1.6 (App Router, Turbopack)          |
| UI         | React 19.2.3, Tailwind CSS v4, Material Symbols |
| Backend    | Supabase (PostgreSQL, Auth, RLS)                |
| Auth       | Supabase Auth (email/password)                  |
| Font       | Manrope (Google Fonts)                          |
| Icons      | Material Symbols Outlined (Google Fonts CDN)    |
| Deployment | Standalone PWA (installable on home screen)     |

### Dependencies

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.97.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4"
  }
}
```

---

## Project Structure

```
/
├── app/
│   ├── layout.jsx                      # Root layout (Manrope font, PWA meta, AppShell wrapper)
│   ├── globals.css                     # Tailwind v4 theme, Material Symbols, safe-area styles
│   ├── page.jsx                        # Landing page — hub with Gym & Finance cards
│   ├── login/page.jsx                  # Sign in (email/password, forgot password)
│   ├── signup/page.jsx                 # Create account
│   ├── profile/page.jsx                # User profile, settings, sign out
│   ├── gym/
│   │   ├── page.jsx                    # Workout days list (SwipeableCards, FAB to create)
│   │   ├── library/page.jsx            # Exercise library (A-Z index, equipment filter)
│   │   ├── stats/page.jsx              # Workout stats (weekly frequency, PRs)
│   │   ├── builder/page.jsx            # Create new workout day
│   │   ├── builder/[day_id]/page.jsx   # Edit existing workout day
│   │   └── workout/[day_id]/page.jsx   # Active workout session (track sets/reps/weight)
│   └── finance/
│       ├── page.jsx                    # Dashboard (income/expense/net, category spending, top accounts)
│       ├── accounts/page.jsx           # Manage accounts (CRUD, card images, balance display)
│       ├── transactions/page.jsx       # Transaction history (grouped by date, edit/delete)
│       └── subscriptions/page.jsx      # Subscription reminders (CRUD, due dates)
├── components/
│   ├── AppShell.jsx                    # Root wrapper — auth, header, nav, routing logic
│   ├── AuthGuard.jsx                   # Route protection (redirects to /login if unauthenticated)
│   ├── BottomNav.jsx                   # 4-tab bottom navigation (switches per workspace)
│   ├── BottomSheet.jsx                 # Modal sheet (forms, confirmations) — uses dvh for iOS
│   ├── SwipeableCard.jsx               # Swipe-left-to-reveal Edit/Delete actions
│   ├── Header.jsx                      # Sticky top bar with menu button and centered title
│   ├── NavigationDrawer.jsx            # Side drawer (workspace switcher + nav links)
│   ├── LoadingSkeleton.jsx             # Animated placeholder bars during loading
│   ├── Toast.jsx                       # Auto-dismiss notification (2.5s, fixed top)
│   └── Card.jsx                        # Generic white card wrapper
├── contexts/
│   └── AuthContext.jsx                 # Auth provider (user, session, signUp, signIn, signOut, resetPassword)
├── hooks/
│   └── useCategories.js                # Expense categories CRUD, seeding, deduplication, color/emoji helpers
├── lib/
│   └── balanceUtils.js                 # recalculateBalance() — atomic idempotent balance computation
├── utils/
│   └── supabase-browser.js             # Browser Supabase client factory
├── public/
│   ├── manifest.json                   # PWA manifest (standalone, dark bg, app icons)
│   ├── icon-192.png                    # PWA icon 192x192
│   └── icon-512.png                    # PWA icon 512x512
├── supabase-migration.sql              # Full DB migration history (RLS, indexes, constraints)
├── package.json
├── next.config.mjs                     # Next.js config (default/empty)
├── postcss.config.mjs                  # PostCSS with @tailwindcss/postcss
├── jsconfig.json                       # Path alias: @/* → ./*
└── .env.local                          # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Design System

### Colors (Tailwind CSS v4 Theme)

```css
--color-primary: #256af4; /* Blue — Gym workspace accent */
--color-primary-light: oklch(from #256af4 l c h / 0.1);
--color-finance: #10b981; /* Green — Finance workspace accent */
--color-finance-light: oklch(from #10b981 l c h / 0.1);
```

- **Slate palette** (50–900) for backgrounds, borders, text
- **Rose** for destructive actions, expenses, errors
- **Emerald/Finance green** for income, success, finance workspace

### Typography

- Font: **Manrope** (variable weight Google Font)
- All form inputs use `text-base` (16px) to prevent iOS Safari auto-zoom

### Icons

- **Material Symbols Outlined** loaded from Google Fonts CDN
- Used as `<span className="material-symbols-outlined">icon_name</span>`
- Filled variant: add `filled` class (uses `font-variation-settings: 'FILL' 1`)

### Mobile-First Patterns

- Safe area insets via `env(safe-area-inset-*)` for notch/home indicator
- `overscroll-behavior-y: none` prevents pull-to-refresh
- Hidden scrollbars globally
- `user-select: none` prevents text selection
- BottomSheet uses `max-h-[85dvh]` (dynamic viewport height for iOS)
- Touch targets minimum 44px
- `active:scale-[0.98]` for tap feedback on buttons

---

## Authentication

### Flow

1. User signs up at `/signup` with email + password
2. Supabase creates auth user + sends confirmation email
3. User signs in at `/login`
4. `AuthContext` stores `user`, `session`, `supabase` client
5. `AuthGuard` wraps all routes — redirects to `/login` if no user
6. Public routes: `/login`, `/signup` (redirect to `/gym` if already signed in)
7. Hub page `/` renders without header/nav (just auth wrapper)

### Auth Context API

```jsx
const {
  user,
  session,
  loading,
  supabase,
  signUp,
  signIn,
  signOut,
  resetPassword,
} = useAuth();
```

---

## App Shell Architecture

### AppShell (`components/AppShell.jsx`)

Root wrapper that handles 3 layout modes:

1. **Auth pages** (`/login`, `/signup`) — just `AuthProvider` + `AuthGuard`, no UI chrome
2. **Hub page** (`/`) — just `AuthProvider` + `AuthGuard`, no header/nav
3. **Workspace pages** — full layout with `Header`, `BottomNav`, `NavigationDrawer`

### Navigation

- **BottomNav**: 4 tabs that change based on workspace
  - Gym: Workouts, Exercises, Stats, Profile
  - Finance: Home, Accounts, Transactions, Profile
- **NavigationDrawer**: Side menu with workspace switcher + detailed nav links (includes Subscriptions for finance)
- **Workspace persistence**: `localStorage.lastWorkspace` remembers last workspace

### Header

- Sticky top, blurred background (`bg-white/80 backdrop-blur-md`)
- Hamburger menu button (opens NavigationDrawer)
- Centered title with optional subtitle (date shown on finance pages)
- Hidden on workout session pages (those have their own header)

---

## Gym Workspace

### Pages

| Route                   | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `/gym`                  | List workout days as SwipeableCards; FAB to create new day                           |
| `/gym/builder`          | Create workout day — name it, add exercises with sets/reps, drag to reorder          |
| `/gym/builder/[day_id]` | Edit existing day (same UI as builder)                                               |
| `/gym/workout/[day_id]` | Active workout — log weight/reps per set, shows previous session data for comparison |
| `/gym/library`          | Exercise library — A-Z letter index, filter by equipment type, CRUD                  |
| `/gym/stats`            | Weekly frequency chart, personal records (highest weight per exercise)               |

### Exercise Equipment Types

- `barbell_dumbbell` — Barbell & Dumbbell
- `machine` — Machine
- `no_equipment` — No Equipment (bodyweight)

### Weight Types (per set log)

- `bodyweight` — Bodyweight exercise
- `per_side` — Weight per side (e.g., dumbbell)
- `total` — Total weight (e.g., barbell)

---

## Finance Workspace

### Pages

| Route                    | Purpose                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `/finance`               | Dashboard — income/expense/net cards, spending by category, top accounts; also has transaction form modal |
| `/finance/accounts`      | Account management — CRUD, card background images, balance display                                        |
| `/finance/transactions`  | Transaction list grouped by date (Today/Yesterday/Date), spending by category, full CRUD                  |
| `/finance/subscriptions` | Subscription reminder management — name, amount, billing cycle, due date                                  |

### Account Types

- `checking` — Checking account
- `savings` — Savings account
- `credit_card` — Credit card (has credit_limit, available_credit, due_date)
- `cash` — Cash

### Transaction Types

| Type           | Effect on Balance                                        | Icon            | Color    |
| -------------- | -------------------------------------------------------- | --------------- | -------- |
| `expense`      | Deducts from account                                     | `receipt`       | Rose/Red |
| `received`     | Adds to account (money from friends/repayments)          | `move_to_inbox` | Green    |
| `income`       | Adds to account (salary/work)                            | `work`          | Green    |
| `transfer`     | Deducts from source, adds to destination                 | `swap_horiz`    | Slate    |
| `subscription` | Deducts from account (logged via subscription reminders) | `subscriptions` | —        |

### Split Expenses

Transactions have both `amount` (total charge) and `personal_amount` (your share):

- `amount` drives balance calculation (the actual card charge)
- `personal_amount` drives analytics/spending reports
- If paying for yourself only, `personal_amount` equals `amount`

### Balance Calculation (`lib/balanceUtils.js`)

The `recalculateBalance()` function is **atomic and idempotent** — it computes balance from scratch every time:

```
balance = starting_balance
        + SUM(income transactions)
        + SUM(received transactions)
        - SUM(expense transactions)
        - SUM(outgoing transfer transactions)
        + SUM(incoming transfer transactions)
```

For credit cards: `available_credit = credit_limit - balance`

Called after every transaction insert/update/delete to keep balances always correct.

### Expense Categories

- 7 default categories seeded on first use: Housing, Food, Electricity, Health, Shopping, Studying, Miscellaneous
- Each category has a name + emoji
- Users can add custom categories with custom emoji
- Auto-deduplication by name (keeps oldest, deletes newer duplicates)
- 16-color palette cycles for category display colors

---

## Database Schema (Supabase / PostgreSQL)

### Gym Tables

```sql
exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  equipment_type TEXT  -- 'barbell_dumbbell', 'machine', 'no_equipment'
)

workout_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
)

day_exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  day_id      UUID REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  target_sets INTEGER,
  target_reps INTEGER,
  sort_order  INTEGER
)

workout_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  day_id          UUID REFERENCES workout_days(id),
  performed_at    TIMESTAMPTZ DEFAULT now(),
  duration_minutes INTEGER
)

workout_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  session_id  UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  weight      NUMERIC,
  weight_type TEXT,   -- 'bodyweight', 'per_side', 'total'
  reps        INTEGER,
  set_number  INTEGER DEFAULT 1
)
```

### Finance Tables

```sql
accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  name             TEXT NOT NULL,
  account_type     TEXT,  -- 'checking', 'savings', 'credit_card', 'cash'
  starting_balance NUMERIC DEFAULT 0,
  balance          NUMERIC DEFAULT 0,
  image_url        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  -- Credit card specific:
  credit_limit     NUMERIC,
  available_credit NUMERIC,
  due_date         INTEGER  -- Day of month (1-31)
)

transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  date            DATE NOT NULL,
  transaction_type TEXT NOT NULL,  -- CHECK: 'expense','income','transfer','subscription','received'
  amount          NUMERIC NOT NULL,
  personal_amount NUMERIC,        -- For split expenses (your share)
  account_id      UUID REFERENCES accounts(id),
  to_account_id   UUID REFERENCES accounts(id),  -- For transfers only
  category        TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)

subscription_reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id),
  name              TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  billing_type      TEXT,  -- 'monthly', 'yearly'
  next_billing_date DATE,
  account_id        UUID REFERENCES accounts(id),
  category          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
)

categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id),
  name       TEXT NOT NULL,
  emoji      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Security

- **Row Level Security (RLS)** enabled on ALL tables
- Each table has 4 policies: SELECT, INSERT, UPDATE, DELETE — all scoped to `auth.uid() = user_id`
- Indexes on `user_id` for all tables

### Constraints

- `transactions.transaction_type` has CHECK constraint: `IN ('expense', 'income', 'transfer', 'subscription', 'received')`

---

## Reusable Components

### BottomSheet

Modal that slides up from bottom. Used for all forms (add transaction, create workout day, etc.).

```jsx
<BottomSheet
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Add Transaction"
>
  {/* form content */}
</BottomSheet>
```

- `max-h-[85dvh]` — uses dynamic viewport height for iOS Safari
- `overscroll-contain` — prevents background scroll
- Drag handle bar at top
- Close button in title row
- Safe area bottom padding

### SwipeableCard

Touch-interactive card that reveals action buttons on swipe left.

```jsx
<SwipeableCard
  id={item.id}
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item.id)}
>
  {/* card content */}
</SwipeableCard>
```

- Direction-locked after 10px movement (horizontal vs vertical)
- Custom event `swipecard-close` ensures only one card open at a time
- 70px per action button (Edit = blue, Delete = rose)

### Toast

```jsx
{
  toast && (
    <Toast message={toast} isVisible={!!toast} onDismiss={() => setToast("")} />
  );
}
```

- Auto-dismisses after 2.5 seconds
- Dark theme (`bg-slate-900`)
- Fixed top position with rounded corners

---

## Key Implementation Patterns

### Double-Tap Prevention

All save functions use a `useRef` guard alongside `useState` to prevent rapid double-taps:

```jsx
const [saving, setSaving] = useState(false);
const savingRef = useRef(false);

async function handleSave() {
  if (savingRef.current) return; // useRef is synchronous — catches rapid taps
  savingRef.current = true;
  setSaving(true); // useState for UI disabled state
  try {
    // ... save logic
  } finally {
    setSaving(false);
    savingRef.current = false;
  }
}
```

### Supabase Error Handling

All database mutations check for errors (Supabase client doesn't throw on failure):

```jsx
const { error } = await supabase.from("transactions").insert(row);
if (error) throw error;
```

### iOS Safari Compatibility

- All `<input>` elements use `text-base` (16px) to prevent auto-zoom
- BottomSheet uses `dvh` units instead of `vh` (accounts for iOS address bar)
- Date and Account fields are stacked **full-width** (not `grid-cols-2`) because iOS native date picker needs room
- `<input type="text">` used instead of `<textarea>` for description fields
- `overscroll-behavior` prevents bounce/pull-to-refresh
- `WebkitOverflowScrolling: 'touch'` for smooth modal scrolling

### Transaction Form Layout

Both `finance/page.jsx` and `finance/transactions/page.jsx` have transaction modals with identical layout:

1. **Type tabs** — 5-column grid (Expense, Received, Income, Transfer, Subscribe)
2. **Amount** — Full width, large `text-2xl` input with `$` prefix
3. **Your Share** — (expense only) Full width, with helper text
4. **Date** — Full width `<input type="date">`
5. **Account** — Full width `<select>`
6. **To Account** — (transfer only) Full width `<select>`
7. **Category** — (expense only) Grid of emoji buttons + add custom
8. **Description** — Full width `<input type="text">` with context-aware placeholder
9. **Save button** — Full width green button with double-tap guard

---

## PWA Configuration

### manifest.json

```json
{
  "name": "Lifestyle Tracker",
  "short_name": "Tracker",
  "display": "standalone",
  "background_color": "#020617",
  "theme_color": "#020617",
  "start_url": "/gym",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Meta Tags (layout.jsx)

```html
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#f8fafc" />
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Both are public (client-side). Security is enforced via Supabase RLS policies, not key secrecy.

---

## Development

```bash
npm run dev     # Start dev server (Turbopack)
npm run build   # Production build
npm run start   # Serve production build
npm run lint    # ESLint
```

Path aliases: `@/*` maps to project root (e.g., `@/components/Header`, `@/hooks/useCategories`).
