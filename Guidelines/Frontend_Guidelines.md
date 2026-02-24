# Frontend Guidelines — Personal Lifestyle Tracker

---

## Project Metadata

| Field | Value |
|---|---|
| **Architecture** | Mobile-First Progressive Web App (PWA) |
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **Database Client** | @supabase/supabase-js |
| **Target Environment** | Safari on iPhone, added to Home Screen ("standalone" mode) |

---

## 1. PWA "Native iOS Feel" — Non-Negotiable Rules

These must be implemented before any feature work. They are what makes the app feel like a real iOS app rather than a website.

### 1.1 Disable Text Selection
Prevents accidental text highlighting when the user taps buttons rapidly.
```css
/* globals.css */
body {
  user-select: none;
  -webkit-user-select: none;
}
```

### 1.2 Disable Pull-to-Refresh
Prevents the whole app from bouncing when scrolling at the very top.
```css
/* globals.css */
body {
  overscroll-behavior-y: none;
}
```

### 1.3 iOS Safe Area Insets
iPhones have a Dynamic Island (or notch) at the top and a swipe bar at the bottom. The main layout wrapper must pad around these so nothing is hidden.
```css
/* globals.css or layout component */
.safe-layout {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 1.4 PWA Manifest
File location: `/public/manifest.json`
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
Link in `app/layout.jsx`:
```jsx
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### 1.5 Numeric Keyboard on All Number Inputs
Always use this on weight, reps, and amount fields so iOS shows the number pad, not the full keyboard.
```jsx
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*"
/>
```

---

## 2. Design System

### 2.1 Color Palette

**Backgrounds:**
| Token | Tailwind Class | Use |
|---|---|---|
| App background | `bg-slate-950` | Root background, deepest layer |
| Card / surface | `bg-slate-900` | All cards, modals, bottom sheets |
| Divider / border | `border-slate-800` | Separators between elements |
| Input background | `bg-slate-800` | Text inputs, dropdowns |

**Text:**
| Token | Tailwind Class | Use |
|---|---|---|
| Primary text | `text-slate-50` | Headings, primary content |
| Body text | `text-slate-300` | Standard paragraph text |
| Muted / secondary | `text-slate-400` | Previous session data, dates, captions |
| Placeholder | `text-slate-500` | Input placeholder text |

**Semantic / Accent Colors:**
| Token | Tailwind Class | Use |
|---|---|---|
| Gym primary | `bg-indigo-600` / `text-indigo-400` | Gym buttons, active gym tab, gym accents |
| Income / positive | `text-emerald-400` | Income amounts, positive net, checking/savings balances |
| Expense / negative | `text-rose-400` | Expense amounts, credit card balances owed, negative net |
| Warning / due soon | `border-amber-500` | Subscription reminders past due date |

**Finance tab primary:** uses `emerald-600` for buttons to visually distinguish from the gym tab's `indigo-600`.

---

### 2.2 Typography

**Font:** Inter (Next.js default — no install needed)

| Element | Tailwind Classes |
|---|---|
| Page title (e.g., "My Workouts") | `text-2xl font-bold tracking-tight text-slate-50` |
| Section header | `text-lg font-semibold text-slate-50` |
| Card title | `text-base font-semibold text-slate-50` |
| Body / label | `text-sm text-slate-300` |
| Muted info (e.g., "Last: 45lbs × 6") | `text-xs text-slate-400` |
| Amount (large, dashboard) | `text-3xl font-bold` + semantic color |

---

## 3. Core Components

### 3.1 Bottom Navigation Bar

**File:** `/components/BottomNav.jsx`

**Rules:**
- `fixed bottom-0 w-full` — always at the bottom
- `bg-slate-900/90 backdrop-blur-md` — frosted glass effect
- `border-t border-slate-800` — subtle top divider
- Padding: `pb-[env(safe-area-inset-bottom)]` so it sits above the iPhone swipe bar
- Two items: Gym (Dumbbell icon) and Finance (Wallet icon)
- Active tab: icon color `text-indigo-400` (Gym) or `text-emerald-400` (Finance)
- Inactive tab: icon color `text-slate-500`

```jsx
// /components/BottomNav.jsx
'use client'
import { Dumbbell, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const isGym = pathname.startsWith('/gym')
  const isFinance = pathname.startsWith('/finance')

  return (
    <nav
      className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link href="/gym" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isGym ? 'text-indigo-400' : 'text-slate-500'}`}>
        <Dumbbell size={22} />
        <span className="text-xs">Gym</span>
      </Link>
      <Link href="/finance" className={`flex-1 flex flex-col items-center py-3 gap-1 ${isFinance ? 'text-emerald-400' : 'text-slate-500'}`}>
        <Wallet size={22} />
        <span className="text-xs">Finance</span>
      </Link>
    </nav>
  )
}
```

---

### 3.2 Card Component

Used for Day cards, exercise cards, account cards, transaction rows.

**Base classes:** `bg-slate-900 rounded-xl p-4 border border-slate-800`

```jsx
// Example usage
<div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
  {/* card content */}
</div>
```

---

### 3.3 Input Fields

All inputs must look consistent and be usable in the gym (large tap targets).

**Base input classes:**
```
bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50
placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500
w-full
```

**Minimum height:** 48px (`min-h-12`) for all tappable inputs and buttons.

---

### 3.4 Primary Button

**Gym context (indigo):**
```
bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base
```

**Finance context (emerald):**
```
bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl py-4 w-full text-base
```

**Use `active:` pseudo-class** instead of `hover:` for touch feedback. On mobile there is no hover state.

---

### 3.5 Toast / Success Notification

Use a simple fixed-top toast for success confirmations (e.g., "Workout saved! 💪").
- Position: `fixed top-4 left-4 right-4` (appears below the Dynamic Island area)
- Style: `bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-50`
- Auto-dismiss: after 2.5 seconds
- Implement with `useState` + `setTimeout` — no external library needed.

---

### 3.6 Bottom Sheet Modal

Used for: Add Transaction, Add Exercise, Exercise Picker, Add Account, Add Subscription.

- Slides up from the bottom
- `fixed inset-x-0 bottom-0` with `rounded-t-2xl` top corners
- `bg-slate-900 border-t border-slate-800`
- Has a drag handle at the top (`w-10 h-1 bg-slate-700 rounded-full mx-auto mt-3`)
- Backdrop: `fixed inset-0 bg-black/60` (tapping closes the modal)
- `pb-[env(safe-area-inset-bottom)]` at the bottom for safe area

---

## 4. Screen Layout Template

Every screen follows this structure:

```jsx
// Root layout wrapper in app/layout.jsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 select-none overscroll-none">
        <div
          className="min-h-screen pb-20"  /* pb-20 accounts for bottom nav */
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
```

Each page:
```jsx
export default function GymHome() {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">My Workouts</h1>
      {/* content */}
    </div>
  )
}
```

---

## 5. Loading & Empty States

**Loading skeleton:** Use `animate-pulse` with gray placeholder blocks while data is fetching. Never show a blank screen.
```jsx
<div className="bg-slate-800 rounded-xl h-20 w-full animate-pulse" />
```

**Empty state:** When a list has no items, show a centered message.
```jsx
<div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
  <Dumbbell size={40} />
  <p className="text-sm">No days yet. Create your first workout!</p>
</div>
```

---

## 6. File Structure

```
/app
  /gym
    /page.jsx                  → [GYM-1] Gym Home
    /workout/[day_id]/page.jsx → [GYM-2] Active Workout
    /builder/page.jsx          → [GYM-3] Day Builder (create)
    /builder/[day_id]/page.jsx → [GYM-3] Day Builder (edit)
    /library/page.jsx          → [GYM-4] Exercise Library
  /finance
    /page.jsx                  → [FIN-1] Finance Dashboard
    /accounts/page.jsx         → [FIN-3] Account Manager
    /subscriptions/page.jsx    → [FIN-4] Subscription Reminders
  /layout.jsx                  → Root layout (BottomNav, safe areas, globals)

/components
  /BottomNav.jsx
  /Card.jsx
  /BottomSheet.jsx
  /Toast.jsx
  /LoadingSkeleton.jsx

/utils
  /supabase.js                 → Supabase client singleton
```
