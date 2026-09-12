# Implementation Plan — Weekly Family Menu Planner (V1)

References:

- `system architecture/system architecture.md` — how to build
- `problem statement/problem_statement.md` — product law
- `edge case/edge case.md` — acceptance list
- `Meal catalog.md` — only source of generate/suggestion dishes

This plan is the build order for V1: a mobile-first Next.js site for one Android Chrome user, rules engine in the client, current week in `localStorage`, and a small Vercel job only for reminders.

---

## 0. Outcome and constraints

**Done when** the user can: open the site → Generate → review/change meals from the catalog → edit title/wording/qty/instructions → Approve → copy WhatsApp-style plain text (full week or midweek slot-only) → get day-before and same-day web push for `UNDECIDED` slots (Asia/Kolkata).

**Hard constraints (do not slip into V1):**

- No meal-history DB, no “don’t repeat last week”
- No WhatsApp API / auto-send
- No table-shaped copy
- No native store apps, no iOS push
- No AI generator
- Server never generates menus
- Suggestions and generate never leave `Meal catalog.md`

**Supported client:** Android Chrome. Add to Home Screen is optional.

---

## 1. Delivery phases

Build in this order so engines are testable before UI and push.

| Phase | Name | Delivers | Primary IDs |
|---|---|---|---|
| 0 | Bootstrap | Next.js app, types, PWA skeleton, IST week helpers | M1, M4 |
| 1 | Catalog | `data/meals.ts` derived from `Meal catalog.md` | G10, G12, G17, G22, G23 |
| 2 | Quantity engine | Defaults, max 20, pairing, second subji, empty fields | Q1–Q16, T6 |
| 3 | Rules engine | Generate 14 slots + suggest first/more | G1–G24, C1–C16, edge §8 |
| 4 | Week store | `localStorage`, status machine, slot status | S1–S6, C12, C13 |
| 5 | Message builder | Template, full week vs slot copy, clipboard | A1–A17, T1–T5 |
| 6 | UI | Week grid, slot editor, suggestions, approve | M1–M5, product journey A–D |
| 7 | Reminder bridge | Subscribe, snapshot, cron, digest, de-dupe | N1–N14 |
| 8 | Harden | Happy-path test week, edge-case checklist, deploy | Edge §10 |

Do not start Phase 6 until Phases 2–5 have unit tests. Do not start Phase 7 until the week store can upsert an undecided map.

---

## 2. Target repo shape

```text
app/
  page.tsx                 # week view (home)
  template/page.tsx        # message template editor
  layout.tsx
  api/push/route.ts        # POST subscribe + snapshot upsert
  api/cron/route.ts        # Vercel Cron, IST reminders
lib/
  catalog/                 # load + query meals
  rules/                   # generate, suggest, ordered filters
  quantity/                # defaults, clamp, pairing, Q12
  message/                 # template render, copy scopes
  store/                   # week store + localStorage
  time/                    # Asia/Kolkata week start, slot dates
  push/                    # client subscribe + snapshot sync
data/
  meals.ts                 # derived catalog (keep names/sections aligned)
types/
  week.ts
  meal.ts
public/
  manifest.webmanifest
  sw.js                    # receive web push
vercel.json                # cron schedule
```

Product docs stay as markdown in the repo. App data is TypeScript copied from the catalog; **do not** parse markdown at runtime.

---

## 3. Domain model (implement first)

### 3.1 Meal

```ts
type MealKind = "roti" | "subji" | "dal" | "junk" | "other";

type Meal = {
  id: string;              // stable slug, e.g. "choli-nu-shaak"
  name: string;            // catalog title; default display title
  kind: MealKind;
  section: "gujarati-sabzis" | "dal-kadhi" | "rice-one-pot" | "rotli-breads" | "junk-variety";
  tags: string[];          // "gujarati" | "staple" | ...
  lunchOnly: boolean;
  dinnerDefaultOk: boolean; // fansi: true; lunch-only: false
  lunchDefaultOk: boolean;  // fansi: false; choli/bhinda: true
  active: boolean;
  vegetarian: true;
  excludePlainRice: boolean; // G23 / junk fried rice
  isStaple: boolean;
  avoidAsDefault: boolean;   // rajma/chole family (Chole Bhature, Chole Kulche)
};
```

### 3.2 Slot item and week

```ts
type SlotStatus = "UNDECIDED" | "DECIDED";
type WeekStatus = "NOT_CREATED" | "GENERATED" | "UNDER_REVIEW" | "APPROVED";

type SlotItem = {
  mealId: string;
  kind: MealKind;
  title: string;                 // editable; empty → catalog name (T2)
  wording: string;               // optional; omit when empty (T3)
  quantity: number | null;       // null = cleared (Q8, Q16)
  paired?: boolean;              // auto tindora; Q12 must not rewrite
};

type Slot = {
  id: string;                    // e.g. "2026-09-01-lunch"
  date: string;                  // YYYY-MM-DD in IST
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon=1
  mealType: "lunch" | "dinner";
  items: SlotItem[];
  instructions?: string;
  slotStatus: SlotStatus;
};

type Week = {
  weekStart: string;             // Monday YYYY-MM-DD IST
  status: WeekStatus;
  slots: Slot[];                 // always length 14
};
```

**Title vs identity:** UI and copy use `title`/`wording`. Rules always use `mealId` + `kind` (T1, C16).

### 3.3 Status transitions

```text
NOT_CREATED --Generate--> GENERATED --any edit--> UNDER_REVIEW --Approve--> APPROVED
APPROVED --edit--> UNDER_REVIEW
APPROVED --Generate (confirm)--> GENERATED   (S4 / G2)
```

No `SENT` state. Approve copies; it does not send.

---

## 4. Phase 0 — Bootstrap

**Stack:** Next.js (App Router), TypeScript, mobile-first CSS (no desktop-first layout). Host on Vercel Hobby.

**Work:**

1. Create the Next.js app in this workspace (or a `web/` subfolder if docs should stay at repo root — prefer app at repo root with docs folders kept).
2. `Asia/Kolkata` helpers:
   - `getCurrentWeekStart(now)` → Monday of current IST week (G16, S6)
   - `slotCalendarDate(weekStart, weekday)`
   - Never use UTC date for “same day” (N13)
3. Web app manifest + empty service worker (fill in Phase 7).
4. Portrait-first layout shell: header with week range + `n/14 decided`, primary **Generate Menu**, secondary **Approve** / **Copy**.

**Out of this phase:** business rules, push send.

---

## 5. Phase 1 — Meal catalog

**Source of truth:** `Meal catalog.md`. Implementation copy: `data/meals.ts`. Names and sections must stay aligned.

### 5.1 Section → kind

| Catalog section | `kind` | Used for |
|---|---|---|
| Gujarati sabzis | `subji` | Default plate subji; first-wave subji |
| Dal / Kadhi | `dal` | Default plate dal; first-wave dal |
| Rice / one-pot meals | `other` | User override only (G5) |
| Rotli / breads | `roti` | Default roti; Wednesday lunch; bread overrides |
| Junk Food / Variety | `junk` | Exactly one Fri or Sat dinner on generate |

### 5.2 Flags to encode from catalog notes

| Rule | Catalog items |
|---|---|
| `lunchOnly` | Choli nu Shaak, Bhinda nu Shaak, Bharwa Bhinda |
| `lunchDefaultOk: false` (staple dinner default) | Fansi nu Shaak (G20) |
| `isStaple` (subji) | Choli, Bhinda, Fansi, Vatana Bateta, Tindora, Kobi |
| `dalDefaultOk` | **true:** Tuvar Dal (toor, preferred), Gujarati Dal (plain dal fallback). **false:** Turya Moong Dal — pairing only, never generate/first-wave default (G24) |
| `excludePlainRice` | Gujarati Vagharelo Bhaat, Dal-Bhaat-Shaak, Veg Schezwan Fried Rice, Manchurian with Fried Rice |
| Keep as override (khichdi/pulao) | All *Khichdi*, Vegetable Pulao, Kadhi-Khichdi |
| `avoidAsDefault` | Chole Bhature, Chole Kulche (G11 / C8). Catalog has no rajma; still keep a name filter for “rajma”/“chole” |
| Default roti | Roti / Phulka |

**Catalog hygiene (do in this phase):** duplicate numbering (`50` used twice in the markdown) must not become duplicate `id`s. Use unique slugs.

**G18:** if after filters the junk section has zero eligible dishes, generate **fails visibly** — do not silently fill Fri/Sat dinner with roti + dal + sabzi.

**G23:** never generate or suggest excluded rice/fried-rice items. Mexican Rice & Beans: treat as rice-forward junk; **exclude** under no-plain-rice unless product later reclassifies it (safer: exclude).

**Tests:** every `Meal.name` exists in `Meal catalog.md`; no generate candidate has `excludePlainRice` or `vegetarian !== true` or `active === false`.

---

## 6. Phase 2 — Quantity engine

Single module: `applyQuantities(slot, trigger)`.

| Trigger | Behaviour | IDs |
|---|---|---|
| New roti / subji / dal | 13 / 3 / 3 | Q1, Q2, Q3 |
| Turya moong dal added | Ensure tindora item `paired: true`, qty **1** | Q15, G21, T6 |
| User adds second **manual** subji | Both non-paired subjis → **2** | Q12 |
| User clears qty | Stay `null`; do not refill until they type | Q8 |
| Value > 20 | Clamp or reject at 20 | Q6 |
| Non-integer | Reject; keep last valid | Q7 |
| 0 | Do not allow as normal qty (min 1 or omit item) | Q5 |
| Override dish (khichdi, pav bhaji, …) | No forced default | Q4 |
| Generate Menu | New items get defaults again | Q8, T5 |
| Kind change (dal → subji) | Qty to new type default; title → catalog name | Q14 |

**Priority:** pairing (tindora qty 1) **wins over** Q12 (edge §8 item 7).

**Copy:** `quantity === null` → omit qty (Q16, A11). Empty instructions omitted (Q9). Long / Gujarati / emoji instructions kept (Q10, Q11).

---

## 7. Phase 3 — Rules engine

One module for **generate** and **suggest** so behaviour cannot drift (problem statement §8). Encode edge case §8 as **ordered filters**, not competing generators.

### 7.1 Ordered filters (always)

1. Vegetarian only  
2. No plain rice (`excludePlainRice` or name match)  
3. `active`  
4. Lunch-only never at dinner (G7, C2)  
5. Catalog membership only (G22)

Then ranking / generator-specific rules.

### 7.2 Generate (`generateWeek(weekStart)`)

1. Build 14 empty slots Mon–Sun lunch+dinner (G16).
2. Pick **exactly one** of Friday dinner or Saturday dinner as junk (G8, G9, G18). Deterministic: e.g. hash `weekStart` → Fri or Sat so regenerate can change with confirm (G2) but a given week is stable until regenerate.
3. For every other slot except Wednesday lunch: plate = roti (Roti/Phulka) + one subji + one dal (G19).
4. Wednesday lunch: roti only (G6, G14).
5. Subji picker:
   - Staples first if in catalog (G10)
   - Skip lunch-only at dinner (G13)
   - Never fansi at lunch on generate (G20)
   - Never rajma/chole (G11)
   - Prefer spreading unused staples (G15 optional, not required)
6. Dal picker: **Tuvar Dal** (toor) if in the catalog, else **Gujarati Dal**, then other Dal/Kadhi. **Never** auto-pick turya moong dal (G24); never rajma/chole (G11).
7. If a slot’s dal is turya moong (user / Generate More only, not generate default) → attach paired tindora qty 1 (G21). Do **not** treat as Q12.
8. Junk night: one dish from Junk/Variety after G23 filters (Pav Bhaji, Ragda Pattice preferred).
9. Khichdi/pulao **never** on generate (G4, G5).
10. Apply quantity defaults + catalog titles + empty wording.
11. All filled slots `DECIDED`; week `GENERATED`.

**G2 / S4:** if a week already exists, confirm overwrite. Replaced items: catalog titles, empty wording, default qtys.

### 7.3 Suggest (`suggest({ slot, week, wave })`)

- `wave`: `first` | `more`
- Filter catalog with the same hard rules.
- **First wave:** staples if present, then Gujarati sabzis / dal-kadhi; no rajma/chole; no fansi as lunch **default** (C8); no turya moong dal as a **default** dal (G24 — Tuvar Dal / Gujarati Dal first). Return ~4.
- **More wave:** next page of remaining eligible catalog items (C9). Exhausted → empty state, do not loop (C10). Never leave catalog.
- Wednesday lunch override: **do** return lunch suggestions (C1). Do not lock roti-only.
- Already used this week: include + `alreadyUsedThisWeek` (C11). Never hide solely for that.
- Junk night already used: first wave for the **other** weekend dinner is a normal plate, not a second junk dish (C3, C4). Manual override still allowed (C5, C6).
- Khichdi/pulao: eligible as override from rice/one-pot after G23 (C14). Not junk.
- User may drop dal/subji (C15); remaining items keep qty/title/wording.

**Select suggestion (C12):** slot `DECIDED`; new dish gets catalog title, empty wording, type default qty; turya moong still pairs tindora.

**Clear slot (C13):** `UNDECIDED`; reminders may start.

### 7.4 Tests (engine, no UI)

Happy path from edge §10 plus at least: G6, G8/G9, G11, G20, G21, G23, G24, C1, C3, C8, C10, C11, Q8, Q12 vs pairing.

---

## 8. Phase 4 — Week store

Client source of truth. Key: `menu-planner:week:${weekStart}`. Also persist message template under `menu-planner:template`.

**Behaviour:**

- Boot: read `localStorage`; if missing or `weekStart` ≠ current Monday → `NOT_CREATED` empty 14 slots (S6). Past days stay visible if the week was already generated (G16).
- Refresh keeps current week (S1). Clearing site data loses everything (S2) — acceptable.
- Two tabs: `storage` event + last write wins (S3).
- Any item/slot edit: `GENERATED`/`APPROVED` → `UNDER_REVIEW` (A5).
- After persist: call reminder bridge `upsertSnapshot` (Phase 7); until then, no-op.

**No history:** next Monday does not load last week (S5).

---

## 9. Phase 5 — Message builder

Configurable template with placeholders: `day`, `mealType`, `title`, `wording`, `qty`, `instructions`. Copy uses **edited title**, never raw catalog id.

**Scopes:**

- `fullWeek` — all 14 slots (Approve / Copy week)
- `slots[]` — only those slot ids (A14, A15)

**Rules:**

- Plain text only (A3)
- Skip empty instructions and empty wording (A9, T3)
- Skip qty if `null` (A11, Q16)
- Wednesday lunch not overridden: roti only (A10)
- Turya moong line includes tindora qty 1 (A13)
- Broken template → default template (A7)
- `navigator.clipboard.writeText`; on failure show selectable text + Select all (A4, A12)

**Approve (A1, A2):**

- All 14 `DECIDED` → `APPROVED` → copy `fullWeek`
- Any `UNDECIDED` → warn listing missing slots; **do not** copy the week as complete
- Midweek path: after filling previously undecided slot(s), primary copy is **those slots only** (A14–A16)
- Re-copy allowed (A6)

Default template text: problem statement §5.D example.

---

## 10. Phase 6 — UI (Android Chrome, portrait-first)

Screens:

1. **Week view** — 7 rows × lunch/dinner; tap slot to edit. Status chip. `n/14`. Generate (confirm if exists). Approve. Copy week vs copy filled slots.
2. **Slot sheet** — items with title, wording, qty, remove/add; slot instructions; Change meal → suggestions (4 + Generate More); already-used badge; clear → UNDECIDED.
3. **Template editor** — live preview with current week.
4. **Push banner** — if permission not granted (N6).

**UX constraints:**

- Thumb-reachable primary actions; do not hide Approve/Copy behind the keyboard forever (M2)
- Works in a Chrome tab without A2HS (M4, N8)
- No Play Store (M5)

**Verification (when implementing):** exercise generate → change meal → edit title/qty → approve → copy on a phone-width viewport; also midweek slot-copy and empty-qty copy.

---

## 11. Phase 7 — Reminder bridge

Cron cannot read `localStorage`. Snapshot is **not** a menu-history DB — overwrite a tiny JSON/KV blob.

### 11.1 Client

1. After Allow: `PushManager.subscribe` (VAPID) → POST `{ endpoint, keys }`
2. On every week persist: upsert `{ weekStart, undecidedSlotIds[], timezone: "Asia/Kolkata" }`
3. No permission: app works; banner only (N6)
4. Revoked permission: stop sending; next visit explain (N7)

### 11.2 Server

- Store: Vercel KV **or** a single JSON file is not durable on serverless — use **Vercel KV / Upstash Redis** (one key per subscription). This is still not a meal database.
- Cron: `vercel.json` twice daily in IST windows that cover “day before evening” and “same-day morning” (e.g. 08:00 and 18:00 IST). Architecture allows hourly; twice daily is enough if windows are chosen so both N1 times fire.
- Load snapshot; compute which undecided slots match day-before vs same-day **in IST** (N13)
- One digest if several match (N4)
- `reminderKey = slotId + date + kind` (`day-before` | `same-day`) to prevent N12 double-send
- Decided slot uploaded → same-day must not fire (N3)
- Past slots: no reminders after same-day (N9)
- `NOT_CREATED`: treat upcoming slots as missing menu (N10)
- Wednesday lunch undecided still reminds (N5)
- Offline device: delay until Chrome online is acceptable (N11)
- iOS: no extra work (N14)

Service worker: show notification; click opens the week view.

**Env:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, KV credentials.

---

## 12. Phase 8 — Harden and ship

1. Run edge §10 happy-path week by hand on Android Chrome (or Chrome device mode + real phone if possible).
2. Tick G/C/Q/T/A/N/S/M IDs as a checklist (engine tests first, UI/push on device).
3. Deploy Vercel: HTTPS required for clipboard and push (M3 — permission is per origin).
4. Confirm generate never invents dishes; copy is not a table; junk night exactly one on generate.

---

## 13. Suggested implementation sequence (tickets)

Work one ticket at a time; keep diffs small.

1. Scaffold Next.js + types + IST week helper  
2. Encode `data/meals.ts` + catalog alignment tests  
3. Quantity engine + tests  
4. Generate + tests (G1–G24 subset)  
5. Suggest first/more + tests (C1–C16 subset)  
6. Week store + status machine  
7. Message builder + clipboard fallback  
8. Week UI + slot editor + suggestion sheet  
9. Template editor  
10. Push subscribe + snapshot API + SW  
11. Cron digest + de-dupe  
12. End-to-end happy path + remaining edge cases  

---

## 14. Explicit non-goals (not bugs)

Aligned with problem statement §12, architecture §9, edge §9:

- Long-term menu DB / last-week uniqueness  
- WhatsApp Business API  
- Table-shaped copy  
- Native store listing  
- Multi-device realtime sync  
- AI as the generator  

---

## 15. Mapping reminder

| Area | IDs | Lives in |
|---|---|---|
| Generate | G1–G24 | `lib/rules` + `data/meals.ts` |
| Suggestions | C1–C16 | Same engine |
| Quantities | Q1–Q16 | `lib/quantity` |
| Titles / wordings | T1–T6, C16 | Week store + message builder |
| Copy / approve | A1–A17 | `lib/message` + week store |
| Push | N1–N14 | Reminder bridge + cron |
| Persistence | S1–S6 | `lib/store` |
| Device | M1–M5 | Next.js UI + PWA |
