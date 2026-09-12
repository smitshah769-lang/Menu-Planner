# Problem Statement — Weekly Family Menu Planner

## 1. Problem

This household of four uses a tiffin service for lunch and dinner. Every week, someone must decide the menu and share it with the tiffin provider so the meals can be prepared.

Planning is a repetitive task. The person responsible needs to apply household rules (vegetarian only, no plain rice, day-specific constraints, Gujarati preference), fill every meal slot, and produce a message the tiffin service can follow.

When the menu is not planned in advance, decisions happen at the last minute. That creates extra mental effort and can leave the tiffin service without clear instructions for a given meal.

The goal is to build a simple tool that makes weekly menu planning almost effortless: the user should be able to generate a complete weekly menu with a single tap, adjust meals using suggested alternatives, edit each dish’s **title** and **wording**, add quantity and instructions per item, approve the menu, and copy a ready-to-paste WhatsApp-style message to the clipboard.

---

## 2. Context

- The menu is for a **tiffin service**, not for cooking at home.
- There are **four people** in the household.
- The household is **Gujarati**.
- Dishes for generate and suggestions come from **`Meal catalog.md`**.
- **Plain rice is cooked at home**, so it should never appear on the tiffin menu. **Khichdi and pulao** from the catalog are allowed.
- **Persistent data storage is not required.** Meals may repeat from last week. The tool does not need to remember previous weeks or avoid repetition based on history.
- The primary phone is **Android**. The tool is a website he can open in Chrome (and optionally Add to Home Screen). No Play Store listing is required.

---

## 3. Target User

The primary user is the family member who plans the household lunch and dinner menu and sends it to the tiffin service. He uses an **Android** phone.

The experience should be simple and low-effort. He should open a link (or a home-screen shortcut), not download an app from the Play Store. He should not need to understand the underlying rules or technology.

### Core user expectation

> **Open the tool → tap Generate → review → change meals if needed → edit titles/wordings → add quantity and instructions → approve → copy message.**

---

## 4. Product Goal

Build a lightweight weekly menu-planning application that:

1. Generates a lunch and dinner menu for the entire week with one tap.
2. Generates the menu according to the household rules below.
3. Allows meals to repeat from previous weeks (no history-based uniqueness).
4. Provides replacement suggestions when the user wants to change a meal, with Gujarati dishes ranked first.
5. Lets the user add **quantity** and **instructions** against each menu item, and **edit the title and wording** of any selected dish. Defaults: roti 13, subji 3, dal 3 (max 20). Default plate is roti + subji + dal unless overridden.
6. Lets the user approve the final menu after edits.
7. Copies a configurable, WhatsApp-style plain-text message to the clipboard (no table layout). **Full week** when copying the planned week; **midweek**, after filling a previously undecided slot, copy **only that slot’s text**.
8. Notifies the user if a meal slot is still undecided: **once the day before**, and **again on the same day**.

---

## 5. Core User Journey

### A. Generate weekly menu

The user opens the application and sees the current week's menu status.

Example:

- 10/14 meals decided
- 4 meals pending

The user taps:

**Generate Menu**

The system generates lunch and dinner for each day of the week.

The generated menu is based on:

- Household rules listed in this document
- **Meal catalog:** `Meal catalog.md` — all generated dishes and replacement suggestions must come from this catalog (sabzis, dal/kadhi, rice/one-pot, rotli/breads, junk/variety), then be filtered by the rules below
- Default composition: **roti + subji + dal** in every slot unless a household rule or the user overrides it
- Default household dishes when they exist in the catalog, plus catalog staples (choli, bhinda, fansi, vatana bateta, tindora, kobi subji, **Tuvar Dal** / **Gujarati Dal** where listed; otherwise closest catalog matches). **Do not** auto-pick turya moong dal.
- **Fansi is not a default lunch subji** (dinner default is fine)
- Meal suitability for lunch vs dinner
- Gujarati dishes as first preference (catalog **Gujarati sabzis** and **Dal / Kadhi** sections first)
- No historical menu database

Meals from last week **may repeat**. The generator must not require stored history.

---

### B. Review generated menu

The user sees the complete weekly menu in the app.

Example (illustrative only; the copied message is not a table):

| Day | Lunch | Dinner |
|---|---|---|
| Monday | Choli subji + Tuvar dal + Roti | Kobi subji + Gujarati Dal + Roti |
| Tuesday | Choli subji + Dal + Roti | Fansi + Dal + Roti |
| Wednesday | Roti only | Vatana bateta + Dal + Roti |
| Thursday | Tindora + Dal + Roti | Kobi subji + Dal + Roti |
| Friday | Bhinda + Dal + Roti | Pav Bhaji |
| Saturday | Choli subji + Dal + Roti | Vatana bateta + Dal + Roti |
| Sunday | Kobi subji + Dal + Roti | Tindora + Dal + Roti |

Notes on this example:

- By default every slot is **roti + subji + dal**, unless overridden.
- Wednesday lunch defaults to roti only. The user may override it and pick suggestions.
- **Fansi is not used as a default lunch subji** (here it appears at Tuesday dinner).
- **Turya moong dal** is **not** a generated default. If the user selects it, it always brings **tindora subji for 1 person** (qty 1).
- Default dal on generate is **Tuvar Dal** (toor) or **Gujarati Dal**.
- After a dish is selected, the user can **edit its title and wording** (example copy uses “Tindora nu shaak”).
- Choli subji and bhinda appear only at lunch.
- Default sabzi/dal choices are the household staples (not rajma or chole).
- Plain rice is never included. Khichdi and pulao are allowed only if the user overrides the default roti + subji + dal slot.
- Friday or Saturday dinner is a junk/tasty dish (here: Friday pav bhaji) — that night is an override of roti + subji + dal.
- All dishes are vegetarian and Gujarati-leaning.

The user can accept the menu or change individual meals.

Each **item** in a meal (not just the whole slot) should support:

- **Title** — the dish name shown in the app and in the copied message. Defaults to the catalog name (e.g. “Tindora”). The user can edit it (e.g. “Tindora nu shaak”). Changing the title does **not** change the underlying dish for rules (lunch-only, pairing, kind).
- **Wording** — optional extra phrasing on that item for the tiffin service (e.g. “cut thick”, “without sugar”). This is separate from slot-level instructions.
- **Quantity**, using these defaults (editable, maximum **20**):
  - **Roti: 13**
  - **Subji: 3** (if the user adds a **second** subji, **both** subjis default to **2**)
  - **Dal: 3**
  - **Tindora paired with turya moong dal: 1** (one person only)
- **Instructions** (free text for the tiffin service, e.g. “less oil”, “no onion”, “medium spice”)

If the user **clears** a quantity field, it stays **empty** until they enter a value. It does not auto-fill the default again.

Other dish types (khichdi, pulao, pav bhaji, etc.) appear only when the user overrides the default roti + subji + dal slot. Those have no required default quantity (still max 20).

---

### C. Change a meal

When the user taps a particular meal, the system should show replacement suggestions from **`Meal catalog.md`**, rather than requiring a full manual search.

Map catalog sections to the slot:

- **Subji** → Gujarati sabzis  
- **Dal** → Dal / Kadhi  
- **Junk night** → Junk Food / Variety (e.g. Pav Bhaji, Ragda Pattice)  
- **Override / one-pot** → Rice / one-pot meals (khichdi, pulao — still **no plain rice**)  
- **Roti / bread** → Rotli / breads  

**Gujarati sabzis and Dal / Kadhi should be listed first**, then other eligible catalog items.

Example:

**Change Tuesday Dinner**

Suggested alternatives (household defaults / Gujarati first):

- Tindora
- Kobi subji
- Vatana bateta
- Fansi

The suggestions must still obey the household rules (vegetarian, no plain rice, lunch-only dishes stay lunch-only, junk-night rule, fansi not as a default lunch pick, etc.). Items not in `Meal catalog.md` must not appear as suggestions. Khichdi and pulao from the catalog **Rice / one-pot** section remain eligible as **overrides** of the default roti + subji + dal plate. **Gujarati Vagharelo Bhaat**, fried rice, and similar “plain rice / bhaat” items must be excluded unless they are clearly khichdi or pulao-style one-pot meals allowed by the no-plain-rice rule.

**Wednesday lunch:** the generated default is roti only. If the user **overrides** that slot, show replacement suggestions (subji, dal, and other eligible lunch items) the same way as other meals — do not lock the slot to roti-only.

If a suggested dish is already used elsewhere that week, **warn** and still **allow** the choice.

If the user selects **turya moong dal**, also add **tindora subji** at quantity **1**.

The user selects one suggestion and the menu is updated. Quantity, instructions, **title**, and **wording** for that slot should remain editable. A newly selected dish starts with the catalog title; the user can then change the wording and title.

The system should also provide:

**Generate More Suggestions**

if the initial options are not suitable.

---

### D. Approve and copy

Once the user is satisfied, they tap:

**Approve**

The system:

1. Marks the weekly menu as approved.
2. Builds a plain-text message from a **configurable WhatsApp-style template**.
3. Copies that message to the clipboard so the user can paste it into WhatsApp (or anywhere else).

There is **no WhatsApp API integration**. The app does not send messages itself.

The copied message must be readable chat text, **not a table**.

### Midweek copy (undecided slot)

If the user opens the app **midweek**, fills a slot that was `UNDECIDED`, then copies:

- The clipboard must contain **only that slot** (that day + lunch or dinner), not Monday–Sunday.
- Use the same WhatsApp-style template, but render **one meal only**.

Example: Tuesday dinner was empty. The user picks the dishes, then copies:

```text
Tuesday
Dinner: Fansi (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
```

If they fill **several** previously undecided slots and then copy in one go, include **only those newly filled slots**, still not the rest of the week.

**Copy full week** remains available when they want the complete menu (after generate/approve of the week).

Past days that were already decided are **not** repeated in a midweek slot copy.

### Configurable message template

The user should be able to edit how the copied message looks (greeting, labels, order of fields, whether instructions appear, etc.).

Default example:

```text
Hi, this week's tiffin menu (4 people):

Monday
Lunch: Choli subji (Qty: 3) + Tuvar Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Kobi subji (Qty: 3) + Gujarati Dal (Qty: 3) + Roti (Qty: 13)
Note: medium spice

Tuesday
Lunch: Choli subji (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Fansi (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)

Wednesday
Lunch: Roti only (Qty: 13)
Dinner: Vatana bateta (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)

Thursday
Lunch: Tindora (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Kobi subji (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)

Friday
Lunch: Bhinda (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Pav Bhaji
Note: extra pav

Saturday
Lunch: Choli subji (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Vatana bateta (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)

Sunday
Lunch: Kobi subji (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
Dinner: Tindora (Qty: 3) + Dal (Qty: 3) + Roti (Qty: 13)
```

The template should support placeholders such as day, meal type, dish **title** (the edited name, not only the catalog name), wording, quantity, and instructions, so the user can change wording without changing the planner itself.

---

## 6. Reminder System

WhatsApp is not used for reminders.

The target device is **Android**. Notifications should use **Chrome web push** (the site can also be added to the home screen so it feels like an app). The user must tap **Allow** once. After that, reminders can arrive even when the site is closed.

A small scheduled job is required to fire those pushes at the right time. A fully static site with no backend cannot wake the phone by itself. This does not require storing weekly menu history.

If a specific meal slot is still **undecided**, the user gets **two** notifications for that slot:

1. **One day before** the meal.
2. **On the same day** as the meal.

Example:

Tuesday dinner is undecided.

- Monday: “Tuesday dinner has not been decided yet.”
- Tuesday: “Today’s dinner has not been decided yet.”

If several slots are undecided, notifications should name those slots clearly.

Reminders for a slot should stop once that slot is decided.

iPhone / App Store delivery is out of scope for V1.

---

## 7. Menu Generation Rules

The generator should be rules-based. These household rules are required for V1:

1. **Strictly vegetarian only.** No non-vegetarian dishes at any slot.
2. **Never add plain rice.** Plain rice is cooked at home and must not appear on the tiffin menu (no plain steamed/boiled rice, no dal + plain rice). **Khichdi and pulao are allowed** in generation and suggestions.
3. **Default plate is roti + subji + dal** for every lunch and dinner slot, unless a more specific rule or a user override applies.
4. **Wednesday lunch defaults to roti only.** No sabzi/dal on generate. If the user **overrides** Wednesday lunch, show suggestions (subji, dal, and other eligible lunch items).
5. **Choli subji and bhinda (bhindi) sabzi are lunch-only.** Never suggest or place them at dinner.
6. **Friday or Saturday dinner must be a junk/tasty dish** such as pav bhaji or ragda pattice — not a standard roti + dal + sabzi meal. Exactly one of those two nights should get this treatment unless the user overrides it. That junk night is an override of the default roti + subji + dal plate.
7. **Gujarati household:** when generating or suggesting dishes, give **Gujarati dishes first preference**.
8. **Default sabzi/dal set.** Generation and first-wave suggestions should prefer household staples **when they appear in `Meal catalog.md`**, then other items from the matching catalog section:
   - Choli subji
   - Bhinda
   - Fansi (**dinner only as a default** — do not auto-pick fansi for lunch)
   - Vatana bateta
   - Tindora
   - Kobi subji
   - **Tuvar Dal** (toor) — preferred generated dal
   - **Gujarati Dal** — fallback generated dal if Tuvar Dal is missing
   Do **not** auto-pick **turya moong dal** on generate or in first-wave dal suggestions. First-wave subji suggestions come from **Gujarati sabzis** in `Meal catalog.md`. First-wave dal suggestions come from **Dal / Kadhi** (Tuvar Dal / Gujarati Dal first). Junk night from **Junk Food / Variety**. Do not suggest dishes that are not in the catalog.
9. **Turya moong dal pairing.** Whenever turya moong dal is **selected by the user** (not as a generate default), also add **tindora subji at quantity 1** (one person only). This pairing is not the “second subji” quantity rule.
10. **Avoid rajma and chole as default choices.** They must not be auto-picked by the generator. The user may still choose them later if offered under “Generate More Suggestions”, but they are not preferred.
11. **Meals may repeat from last week.** Do not block a dish only because it was used recently. If the same dish is already on this week’s menu, **warn** and still **allow**.
12. **Default quantities** (editable per item, **maximum 20**):
    - Roti = 13
    - Subji = 3
    - Dal = 3
    - Tindora when paired with turya moong dal = 1
    - If the user adds a **second** subji to a slot, **both** subjis default to **2**
    - Cleared quantity fields stay **empty** until the user enters a number

Other generator behaviour:

- Respect lunch vs dinner suitability except where a rule is more specific.
- Support manually excluded or preferred meals if easy to add later; not required for V1 beyond the rules above.

---

## 8. Replacement Suggestion Logic

Replacement suggestions must not be random. They must be taken from **`Meal catalog.md`**, then filtered and ranked by household rules.

When replacing a meal, the system should:

1. Identify the meal being replaced.
2. Check the remaining weekly menu (e.g. junk-night already used that week).
3. Apply all household rules.
4. Rank eligible meals with **household default dishes first**, then other Gujarati dishes. Do not rank rajma or chole as defaults.
5. Return a small number of suggestions.

Do **not** exclude a dish only because it appeared last week. If it is already used **this week**, show a **warning** and still allow the selection.

**Wednesday lunch override:** if the user changes that slot, return lunch-eligible suggestions (including subji and dal). Do not refuse suggestions.

Example:

```text
Current meal:
Tuesday Dinner → Vatana bateta

User taps "Change"

        ↓

Retrieve eligible vegetarian dinner meals **from Meal catalog.md**
(exclude plain rice; khichdi and pulao from Rice / one-pot allowed)
(exclude lunch-only: choli subji, bhinda)

        ↓

Apply weekly rules
(e.g. if junk night already set, don't force another pav bhaji)

        ↓

Rank: default staples first (tindora, kobi subji, Tuvar Dal / Gujarati Dal, …)
Lunch: do not default to fansi
Do not rank turya moong dal as a default dal; if it is chosen → add tindora qty 1
Avoid rajma and chole as defaults
Warn if the dish is already used this week; still allow

        ↓

Show 4 suggestions
```

The replacement engine should use the same rules as the main generator.

---

## 9. Data Requirements

**No persistent database is required for V1.** Weekly menus do not need to be stored long-term. History is not used.

The app may keep the **current working week** in memory or simple local state so the user can edit, approve, and copy without losing work during the session.

### Meal list (`Meal catalog.md`)

The source of dishes for generate and suggestions is **`Meal catalog.md`**. It is a static file in the repo (no database). Sections:

- Gujarati sabzis  
- Dal / Kadhi  
- Rice / one-pot meals  
- Rotli / breads  
- Junk Food / Variety  

Each catalog meal used by the app should include:

- Meal name
- Meal type suitability (lunch, dinner, or both)
- Category / tags (e.g. Gujarati, junk/tasty, sabzi, dal)
- Lunch-only flag where needed (choli subji, bhinda)
- Active/inactive

### Current week (session or local only)

- Week being planned
- Status (generated / under review / approved)
- Per slot: dish(es), per-item **title** and **wording** (editable), per-item quantity (roti 13 / subji 3 / dal 3 by default), instructions, decided/undecided

### Message template (local)

- Configurable WhatsApp-style text template for the copied message

---

## 10. Key States

A weekly menu can have the following states:

```text
NOT_CREATED
     ↓
GENERATED
     ↓
UNDER_REVIEW
     ↓
APPROVED
```

There is no **SENT** state. After approval, the user copies the message themselves.

Individual meal slots can have:

```text
UNDECIDED
DECIDED
```

Undecided slots drive the day-before and same-day notifications.

Each decided item also has:

- Title (defaults to catalog name; user-editable)
- Wording (optional; user-editable)
- Quantity (defaults: roti 13, subji 3, dal 3; max 20; empty if cleared; second subji → both 2)
- Instructions (optional, slot-level and/or per item)

---

## 11. MVP Scope

### Must Have

- Mobile-friendly web application, used on Android Chrome (Add to Home Screen optional)
- One-tap weekly menu generation
- Lunch + dinner for seven days
- Default plate: roti + subji + dal unless overridden
- Default quantities: roti 13, subji 3, dal 3 (editable; max 20; second subji → both 2; turya moong dal adds tindora qty 1)
- Fansi not used as a default lunch subji
- Local meal list from **`Meal catalog.md`** (no required backend database)
- Household rules from section 7
- Gujarati-first suggestions from the catalog (sabzis, then dal/kadhi; junk from variety section)
- Wednesday lunch override shows suggestions
- Rajma and chole not used as default generator choices
- Individual meal editing
- Quantity, instructions, **editable title and wording** per item
- Replacement suggestions
- Menu approval
- Configurable WhatsApp-style plain-text message (no table)
- Copy full week, or midweek copy of **only** the previously undecided slot(s) just filled
- Undecided-slot notifications on Android (Chrome web push): day before and same day

### Nice to Have — Later

- Natural-language changes such as:
  - “Don't give me paneer this week.”
  - “Make Friday dinner something special.”
- Saving favourite templates or last week's menu as a starting point (optional; still allowed to repeat)
- AI-assisted meal suggestions
- Grocery list generation
- Recipe links

---

## 12. Non-Goals for V1

The first version should **not** attempt to:

- Persist meal history or prevent repeats from last week.
- Integrate with WhatsApp (no Business API, no auto-send).
- Use a table format in the copied message.
- Build a full recipe application.
- Automatically order groceries.
- Provide detailed nutritional or medical advice.
- Require AI for basic menu generation.
- Create a multi-household or social platform.
- Require a native iOS/Android application.
- Include **plain rice** on the tiffin menu (khichdi and pulao are in scope).

The MVP should prioritize reliability and simplicity over sophistication.

---

## 13. Technical Direction

The application should initially be built as a mobile-first website for **Android Chrome**. No Play Store or App Store listing.

Suggested stack:

- **Development:** Cursor
- **Frontend:** Next.js (PWA-capable so it can be added to the Android home screen)
- **State:** In-memory / local browser state for the current week and message template
- **Hosting:** Vercel
- **Notifications:** Chrome web push on Android (not WhatsApp). A scheduled function sends the day-before and same-day reminders.
- **Clipboard:** Copy approved message to clipboard
- **AI:** Optional and not required for V1

No full database, Play Store listing, or WhatsApp API is required for V1.

---

## 14. Success Criteria

The product should make weekly tiffin-menu planning significantly easier for the household.

The MVP is successful if the user can:

1. Open the application.
2. Tap **Generate Menu** once.
3. Receive a complete seven-day lunch/dinner menu that follows the household rules.
4. Change an unwanted meal using suggested alternatives from **`Meal catalog.md`**.
5. Set quantity, instructions, **title**, and **wording** on each item.
6. Approve the final menu.
7. Copy a configurable, table-free WhatsApp-style message to the clipboard (full week, or **only the newly filled midweek slot**).
8. Receive two reminders for any undecided slot: the day before, and on the day itself.

### Core product principle

> **The user should make as few decisions as possible. The system should do the planning work, while keeping the user in control of the final menu they paste to the tiffin service.**
