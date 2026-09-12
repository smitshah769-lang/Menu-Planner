# System Architecture — Weekly Family Menu Planner

References:

- `problem statement/problem_statement.md`
- `edge case/edge case.md`
- `Meal catalog.md` — source of all generate/suggestion dishes

This document describes how V1 should be built: a mobile-first website for one Android Chrome user, with a rules engine in the client, local state for the current week, and a small scheduled job only for reminders.

---

## 1. Goals of the architecture

- One-tap weekly generate that obeys household rules.
- User stays in control: change meals, edit dish **titles and wordings**, quantities, instructions, then approve.
- Copy a WhatsApp-style **plain-text** message (no send API, no table). Full week or, midweek, **only the slot just filled**.
- Reminders for `UNDECIDED` slots: day before and same day, Asia/Kolkata.
- No database, no meal history, no Play Store, no WhatsApp integration.
- Survive tab refresh for the **current week** (local storage). Losing data after clearing site data is acceptable (S2).

---

## 2. High-level view

```text
┌─────────────────────────────────────────────────────────────┐
│  Android Chrome (optional Add to Home Screen / PWA)         │
│                                                             │
│  UI  →  Week store (localStorage)                           │
│       →  Rules engine (generate / suggest / quantities)     │
│       →  Per-item title + wording (display only)            │
│       →  Message template → Clipboard                       │
│       →  Service worker (receive web push)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           │ push subscription (VAPID)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel                                                      │
│  • Next.js static / SSR app                                  │
│  • Cron (scheduled function, Asia/Kolkata)                   │
│  • Push send API (uses stored subscription + current week    │
│    snapshot needed for “which slots are undecided”)          │
└─────────────────────────────────────────────────────────────┘
```

The **rules engine runs on the client.** The server does not generate menus. The server only:

1. Hosts the site.
2. Stores the **push subscription** (and a compact snapshot of which slots are undecided, or the client re-uploads that when the week changes).
3. Runs a daily cron to send day-before / same-day notifications.

There is still **no meal-history database** and no multi-user backend.

---

## 3. Stack (V1)

| Layer | Choice | Why |
|---|---|---|
| App | Next.js, mobile-first | Matches problem statement; one codebase. |
| PWA | Web app manifest + service worker | Optional home-screen icon; required for reliable web push. |
| Hosting | Vercel Hobby | Personal household tool; HTTPS; cron. |
| Client state | React state + `localStorage` | Current week, template, push permission UI (S1). |
| Meals | **`Meal catalog.md`**, bundled as static app data | No DB (G17, G22). Suggestions and generate only use this file, then household-rule filters. |
| Notifications | Web Push (Chrome on Android) + Vercel Cron | N1–N14. Not WhatsApp. |
| Timezone | `Asia/Kolkata` | N13. |
| Clipboard | `navigator.clipboard` with on-screen fallback | A4, A12. |

Out of V1: PostgreSQL, Supabase, WhatsApp API, native apps, iOS push.

---

## 4. Logical components

```text
┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Meal catalog │──▶│ Rules engine     │──▶│ Quantity engine  │
│ (static)     │   │ generate/suggest │   │ defaults, max 20 │
└──────────────┘   └────────┬────────┘   └────────┬─────────┘
                            │                     │
                            ▼                     ▼
                   ┌─────────────────┐   ┌──────────────────┐
                   │ Week store      │──▶│ Message builder  │
                   │ 14 slots+status │   │ template+copy    │
                   └────────┬────────┘   └──────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Reminder bridge │  (subscription + undecided map)
                   └─────────────────┘
```

### 4.1 Meal catalog

**Source of truth:** `Meal catalog.md`.

Do not suggest or auto-generate a dish that is not in that file (G22). Implementation may copy it into `data/meals.ts` for the app, but names and sections must stay aligned with the markdown catalog.

Sections → slot kinds:

| Catalog section | Used for |
|---|---|
| Gujarati sabzis | Subji on the default plate; first-wave subji suggestions |
| Dal / Kadhi | Dal on the default plate; first-wave dal suggestions |
| Rice / one-pot meals | User override (khichdi, pulao). Exclude plain bhaat / fried rice (G23) |
| Rotli / breads | Roti alternatives / Wednesday lunch override |
| Junk Food / Variety | Friday or Saturday junk dinner (Pav Bhaji, Ragda Pattice, …) |

Each item in app data:

- `id`, `name` (catalog title; copied onto the slot as the default **display title**)
- `kind`: `roti` | `subji` | `dal` | `junk` | `other` (from section)
- `tags`: `gujarati`, `staple`, …
- `lunchOnly`: true for choli, bhinda
- `dinnerDefaultOk`: fansi is true here, false for “default lunch”
- `active`
- `vegetarian` (must be true for V1 catalog)

Plain rice is **not** eligible even if a similarly named rice dish appears in the catalog. Filter with the no-plain-rice rule.

Household staples (choli, bhinda, fansi, …) are preferred **when they exist in the catalog**; otherwise pick the next eligible catalog item in that section. Default **dal** on generate is **Tuvar Dal** (toor) or **Gujarati Dal**, not turya moong dal.

### 4.2 Rules engine

Single module used by **generate** and **suggest** so behaviour cannot drift (problem statement §8).

**Generate** (G1, G19):

1. Build 14 slots for the current Mon–Sun week (G16).
2. For each slot except exceptions: plate = roti + subji + dal.
3. Wednesday lunch: roti only (G6).
4. Pick exactly one of Friday dinner or Saturday dinner as junk (G8, G9, G18).
5. Pick staple subji with ranking; never rajma/chole (G11); never fansi at lunch (G20); never choli/bhinda at dinner (G7, G13).
6. Dal picker: **Tuvar Dal** (toor) if in the catalog, else **Gujarati Dal**, then other Dal/Kadhi. Never auto-pick turya moong dal (G24); never rajma/chole (G11).
7. If dal on a slot is turya moong (user choice / Generate More, not generate default), attach tindora qty 1 (G21). Do not treat that as Q12.
8. Apply quantity defaults and catalog titles (empty wording).
9. Set week `GENERATED`, all filled slots `DECIDED`. User may then edit titles and wordings without changing rules.

**Suggest** (C1–C16):

- Input: slot (day + lunch/dinner), current week, wave = `first` | `more`.
- Filter **`Meal catalog.md`** through the same hard rules (veg, no plain rice, lunch-only, section match, etc.).
- First wave: staples if in catalog, then Gujarati sabzis / dal-kadhi; no rajma, chole; no fansi as lunch default (C8); no turya moong dal as a default dal — prefer Tuvar Dal / Gujarati Dal (G24).
- More wave: further catalog items after the same filters (C9). Exhausted → empty state (C10). Never leave the catalog.
- Wednesday lunch override: **do** return lunch suggestions (C1).
- If candidate already used this week: include it and flag `alreadyUsedThisWeek` for a warning (C11). Never hide solely for that.
- Junk night already used: first wave for the other weekend dinner is a normal plate, not a second junk dish (C3, C4). Manual override still allowed (C5, C6).

**Rule priority** (edge case §8) is encoded as ordered filters, not as competing generators.

### 4.3 Quantity engine

| Trigger | Behaviour |
|---|---|
| New roti / subji / dal | 13 / 3 / 3 |
| Turya moong dal added | Tindora qty **1** (wins over Q12) |
| User adds second subji (manual) | Both subjis → **2** (Q12) |
| User clears field | Stay **empty** (Q8); do not refill until they type |
| Value > 20 | Reject or clamp to 20 (Q6) |
| Non-integer | Reject; keep last valid (Q7) |
| 0 | Do not allow as a normal qty (Q5) |
| Override dish (khichdi, pav bhaji, …) | No forced default (Q4) |
| Generate Menu | New items get defaults again (Q8) |

### 4.4 Week store

Client source of truth for the working week.

- `weekStart` (Monday date, IST)
- `status`: `NOT_CREATED` | `GENERATED` | `UNDER_REVIEW` | `APPROVED`
- `slots[14]`: `{ date, mealType, items[], instructions?, slotStatus }`
- `items[]`: `{ mealId, kind, title, wording, quantity: number | null, paired?: boolean }`  
  - `mealId` / `kind` drive rules (never change when the user edits the label).  
  - `title` defaults to catalog `name`; user-editable (T1–T6). Empty title falls back to catalog name (T2).  
  - `wording` is optional extra text on that item; omitted from copy when empty (T3).  
  `paired` marks auto tindora so Q12 does not rewrite it.

Transitions:

```text
NOT_CREATED --Generate--> GENERATED --any edit--> UNDER_REVIEW --Approve--> APPROVED
APPROVED --edit--> UNDER_REVIEW
APPROVED --Generate (confirm)--> GENERATED   (S4)
```

No `SENT` state. Approve copies text; it does not send.

Slot status `UNDECIDED` | `DECIDED` drives reminders (C13).

Two tabs: last `localStorage` write wins (S3). Week boundary: new Monday → empty week unless already generated (S6).

### 4.5 Message builder

- Configurable template with placeholders: day, meal type, dish **title**, item wording, qty, instructions.
- **Copy scope:**
  - `fullWeek` — all 14 slots (Approve / Copy week).
  - `slots[]` — midweek after filling previously `UNDECIDED` slot(s): render **only those slots** (A14, A15).
- Copy uses `title` (edited), never the raw catalog id.
- Output: plain text only (A3).
- Skip empty instructions and empty per-item wording (A9, T3).
- Skip qty if `null` / empty (A11, Q16).
- Wednesday lunch not overridden: roti only (A10).
- Turya moong line includes tindora qty 1 (A13).
- Broken template → default template (A7).
- Clipboard API, else show selectable text (A4).
- Full-week approve with leftover undecided slots: warn; do not copy the whole week as complete (A2). Slot copy is the midweek path.

### 4.6 Reminder bridge

Because cron cannot read `localStorage` on the phone:

1. After permission, client subscribes to push and POSTs `{ endpoint, keys }` to the host.
2. Whenever the week changes, client upserts `{ weekStart, undecidedSlotIds[], timezone: "Asia/Kolkata" }`.
3. Cron (e.g. twice daily or hourly) loads that snapshot, computes “day before” vs “same day” in IST, sends **one digest** if several slots match (N4), and records `reminderKey = slotId + date + kind` so N12 does not double-send.
4. Deciding a slot uploads a new snapshot → same-day push must not fire (N3).
5. No permission: app still works; banner only (N6).
6. Past slots: no further reminders after same-day (N9).
7. `NOT_CREATED`: treat upcoming slots as missing menu (N10).

This snapshot is **not** a menu-history database. It can be a tiny KV / JSON blob on the host, overwritten each time. When the user clears site data, reminders stop until they open the app again (S2).

---

## 5. Core user flows

### 5.1 Generate

```text
Open app → read localStorage
  → NOT_CREATED: show 0/14
  → Generate
      → confirm if week already exists (G2)
      → rules engine fills 14 slots
      → persist GENERATED + DECIDED
      → sync undecided map (empty)
```

### 5.2 Change meal

```text
Tap slot → suggest(first)
  → show 4 + "already used" badges
  → Generate More → suggest(more)
  → select
      → apply pairing / quantities
      → set title from catalog; wording empty
      → warn if alreadyUsedThisWeek (C11)
      → user may edit title and wording (C16)
      → slot DECIDED, week UNDER_REVIEW if it was APPROVED
```

### 5.3 Approve and copy

```text
Full week:
  Approve (all decided) → APPROVED → render template(fullWeek) → clipboard

Midweek:
  Fill previously UNDECIDED slot → Copy
      → render template(slots = [that slot only]) → clipboard
      → do not include the rest of the week
```

---

## 6. Client vs server responsibility

| Concern | Client | Server |
|---|---|---|
| Meal catalog | Yes (bundled from `Meal catalog.md`) | No |
| Generate / suggest / quantities | Yes | No |
| Current week UI state | Yes (`localStorage`) | Optional compact undecided snapshot only |
| Message template | Yes | No |
| Clipboard | Yes | No |
| Web push receive | Service worker | — |
| Web push send | — | Cron + push API |
| WhatsApp | Neither (user pastes) | Neither |
| History of past weeks | Neither | Neither |

---

## 7. Deployment and device

- Public URL (`*.vercel.app` is enough). HTTPS required for push and clipboard.
- Android Chrome is the supported client. iOS is out of scope (N14).
- Add to Home Screen is optional (M4); notifications should work from a Chrome tab after Allow (N8).
- Portrait-first layout (M1, M2).
- Notification permission is per origin (M3).

---

## 8. Mapping architecture to edge cases

| Area | IDs | Where they live |
|---|---|---|
| Generate rules | G1–G24 | Rules engine + `Meal catalog.md` |
| Suggestions / overrides | C1–C16 | Same engine; catalog sections |
| Quantities | Q1–Q16 | Quantity engine |
| Titles / wordings | T1–T6, C16 | Week store display fields; message builder |
| Copy / approve | A1–A17 | Message builder (`fullWeek` vs slot scope) + week store |
| Push | N1–N14 | Reminder bridge + cron |
| Persistence | S1–S6 | `localStorage` + week key |
| Device | M1–M5 | Next.js UI + PWA |

---

## 9. What V1 explicitly does not include

Aligned with problem statement §12 and edge case §9:

- No long-term menu DB or “don’t repeat last week”
- No WhatsApp Business API
- No table-shaped copy
- No native store listing
- No multi-device realtime sync
- No AI as the generator

---

## 10. Suggested repo shape (when implementation starts)

```text
app/                 # Next.js routes (week view, template editor)
lib/rules/           # generate, suggest, priority filters
lib/quantity/        # defaults, max 20, pairing, second subji
lib/message/         # template render
lib/store/           # localStorage week store
data/meals.ts        # derived from Meal catalog.md
public/              # manifest, service worker
app/api/push/        # subscribe + snapshot upsert
app/api/cron/        # IST reminders
```

Implementation should treat `problem statement/problem_statement.md` as product law and `edge case/edge case.md` as the acceptance list for the engines above.
