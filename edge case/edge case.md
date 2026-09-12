# Edge Cases — Weekly Family Menu Planner

Derived from `problem statement/problem_statement.md`. Meal names for generate and suggestions come from **`Meal catalog.md`**. These cases should be handled in V1 unless marked later.

---

## 1. Menu generation

| ID | Case | Expected behaviour |
|---|---|---|
| G1 | User taps **Generate Menu** when the week is empty (`NOT_CREATED`) | Fill all 14 slots (7 lunches + 7 dinners) in one tap, following household rules. |
| G2 | User taps **Generate Menu** again after a menu already exists | Replace the generated dishes with a new set, or confirm before overwrite. Do not require last-week history. Reset titles to catalog names and clear item wording on replaced items; reset quantities to defaults unless a simpler keep-edits path is chosen. Behaviour must be consistent and obvious. |
| G3 | Generated week repeats dishes from “last week” | **Allowed.** Do not block or reshuffle only because a dish was used recently. |
| G4 | Generator would pick **plain rice** or dal + plain rice | **Never.** Khichdi or pulao only if the user later **overrides** the default plate. |
| G5 | Generator considers **khichdi** or **pulao** | **Not as a default.** Default slots are roti + subji + dal. Khichdi/pulao only after user override (except they remain eligible in suggestions). |
| G6 | **Wednesday lunch** (generate) | Default is **roti only**. No sabzi, dal, khichdi, pulao, or junk dish on generate. User may override (see C1). |
| G7 | **Choli subji** or **bhinda** placed at dinner | **Never** by the generator. Lunch only. |
| G8 | **Friday dinner** and **Saturday dinner** both get a normal roti + dal + sabzi meal | **Invalid.** Exactly one of Friday or Saturday dinner must be a junk/tasty dish (e.g. pav bhaji, ragda pattice), unless the user later overrides. |
| G9 | Both Friday and Saturday dinner get junk dishes | **Invalid for auto-generate.** Exactly one junk night, not zero and not two. |
| G10 | Default staple pool is used | Prefer household staples **if they exist in `Meal catalog.md`**, then other catalog sabzis/dals. Default **dal** is **Tuvar Dal** (toor) or **Gujarati Dal**, not turya moong (G24). Do not invent dishes that are not in the catalog. |
| G11 | Generator picks **rajma** or **chole** as a default | **Never.** |
| G12 | Non-vegetarian dish | Must never appear. Catalog is vegetarian; do not add items outside `Meal catalog.md`. |
| G13 | Default staple is lunch-only (choli, bhinda) and the slot is dinner | Skip it for that slot; pick another default from the catalog (dinner-eligible sabzis). |
| G14 | Wednesday lunch vs junk-night rule | Junk night applies to Friday **or** Saturday **dinner** only. Wednesday lunch stays roti only on generate. |
| G15 | Same default sabzi used several times in one generated week | Allowed (no uniqueness rule). Still preferable to spread staples when there are unused ones, but not required. If the user later picks a dish already used this week, **warn and allow** (C11). |
| G16 | User opens the app mid-week | Still plan the **current calendar week** (Mon–Sun unless otherwise defined). Do not skip past days unless a later rule is added. Past slots can remain visible and editable. Filling a leftover `UNDECIDED` slot and copying must copy **only that slot’s text** (A14), not the full week. |
| G17 | Meal list has inactive items | Do not generate or suggest inactive items. `Meal catalog.md` is the active list unless an item is flagged inactive in app data derived from it. |
| G18 | Meal list is missing junk dishes | Generation must still satisfy junk-night from catalog **Junk Food / Variety**; if that section cannot yield an eligible dish, fail visibly rather than filling Friday/Saturday dinner with roti + dal + sabzi. |
| G19 | Default plate | Every slot is **roti + subji + dal**, except Wednesday lunch (roti only) and the one junk Friday/Saturday dinner, unless the user overrides. Subji/dal/junk names come from `Meal catalog.md`. |
| G20 | **Fansi** as lunch default | **Never.** Do not auto-pick fansi for lunch. Fansi may be a default at **dinner**. User may still pick fansi at lunch via override / Generate More if it is in the catalog. |
| G21 | User selects **turya moong dal** (Change / Generate More) | Also add **tindora subji at qty 1** (one person). Keep roti (13) and dal (3). Do not apply Q12 to this auto-pairing. Use catalog titles when those dishes exist in `Meal catalog.md`. Generate must not place turya moong by itself (G24). |
| G22 | Suggestion or generate picks a dish **not** in `Meal catalog.md` | **Never.** First-wave and Generate More both stay inside the catalog, after rule filters. |
| G23 | Catalog **Rice / one-pot** item is plain bhaat / fried rice | Exclude under the no-plain-rice rule. Keep khichdi and pulao. |
| G24 | **Turya moong dal** as generate or first-wave default dal | **Never.** Auto-pick **Tuvar Dal** (toor) if it is in the catalog, else **Gujarati Dal**, then other Dal/Kadhi. User may still choose turya moong later; then apply G21. |

---

## 2. Changing a meal / suggestions

| ID | Case | Expected behaviour |
|---|---|---|
| C1 | User **overrides Wednesday lunch** | **Give suggestions from `Meal catalog.md`** (sabzis, dal/kadhi, rotli/breads). Do not lock the slot to roti-only. First-wave: catalog filters — no rajma/chole, no fansi as a *default* lunch pick, no plain rice. Selecting turya moong dal still adds tindora qty 1 if those items are in the catalog. |
| C2 | User changes a **dinner** | Do not suggest choli subji or bhinda. |
| C3 | User changes **Friday dinner** when Saturday is already the junk night | First-wave suggestions should be normal eligible dinners (roti + subji + dal pattern), not a second pav bhaji/ragda pattice. |
| C4 | User changes **Saturday dinner** when Friday is already the junk night | Same as C3: do not force another junk dish. |
| C5 | User **overrides** and wants junk on both Friday and Saturday | Allowed as a manual override. Generator must not do this on its own. |
| C6 | User replaces the junk night with a normal roti + subji + dal meal, leaving **zero** junk nights | Allowed as override. Optionally warn; do not block. |
| C7 | User changes a lunch slot | Choli and bhinda are eligible. Rajma and chole still not in the first four suggestions. Fansi is not in the first-wave lunch defaults. Turya moong dal is not in first-wave dal defaults (G24). |
| C8 | First-wave suggestions | From **`Meal catalog.md`**: matching section (sabzis / dal / junk / one-pot / breads). Household staples first if present in the catalog, then other Gujarati catalog items. No rajma/chole. No plain rice. No fansi as a default lunch suggestion. First-wave **dal** prefers Tuvar Dal / Gujarati Dal; do not rank turya moong dal as a default (G24). |
| C9 | **Generate More Suggestions** | Next page of the **same catalog**, after filters. May include less-preferred catalog items. Still no non-veg, no plain rice, no lunch-only dishes at dinner. Do not leave the catalog. Wednesday lunch **may** include extra catalog items when the user is overriding (C1). |
| C10 | **Generate More Suggestions** when almost nothing eligible remains | Show an empty/exhausted state. Do not loop the same four forever without saying so. Do not break rules to fill the list. |
| C11 | Suggested dish is already used elsewhere **this week** | **Warn**, then **allow**. Do not hide it and do not block. |
| C12 | User selects a suggestion | Slot becomes `DECIDED`. Existing quantity/instructions/title/wording on items that still apply should remain; new dish types get the catalog **title**, empty **wording**, and the correct default quantity (roti 13 / subji 3 / dal 3 / tindora-with-turya-moong 1). If turya moong dal is selected, add tindora qty 1. |
| C13 | User clears a slot instead of picking a replacement | Slot becomes `UNDECIDED`. Reminders can start for that slot. |
| C14 | Khichdi/pulao offered as dinner replacements | Allowed as an **override** from catalog **Rice / one-pot meals**, unless that would violate junk-night auto-logic (see C3/C4 — khichdi/pulao are not junk/tasty dishes). Exclude plain bhaat / fried rice (G23). |
| C15 | User overrides a default plate to drop dal or subji | Allowed. Remaining items keep their quantities, titles, and wordings. |
| C16 | User edits a selected dish **title** or **wording** | Allowed at any time after the dish is on the slot. Copied message uses the edited title/wording. Rules still use the catalog dish (kind, lunch-only, pairing). |

---

## 3. Quantities, titles, wordings, and instructions

| ID | Case | Expected behaviour |
|---|---|---|
| Q1 | Default slot (roti + subji + dal) | Roti **13**, subji **3**, dal **3**. Titles default to catalog names. |
| Q2 | Slot is subji + roti only (user dropped dal) | Subji **3**, roti **13**. |
| Q3 | Wednesday lunch roti only (not overridden) | Roti **13** only. No subji/dal quantity. Title still editable (e.g. “Roti” → “Phulka”). |
| Q4 | Slot is khichdi, pulao, pav bhaji, etc. (user override) | No forced default quantity. User can leave blank or type a number (max 20). Title and wording are editable. |
| Q5 | User edits quantity to **0** | Treat as invalid or as “do not send this item”. Prefer: do not allow 0; keep a minimum of 1, or omit the item from the copied message if explicitly removed. |
| Q6 | User enters a number **greater than 20** (e.g. 21, 999) | **Do not allow.** Reject or clamp to **20**. Do not crash. |
| Q7 | User enters decimals or text in quantity | Reject non-integers. Keep the previous valid value. |
| Q8 | User **clears** quantity | Show **empty** until they enter a number. Do **not** auto-restore 13/3/3. After **Generate Menu**, new items still get defaults. |
| Q9 | Instructions empty | Copied message omits the note line for that slot. |
| Q10 | Instructions very long | Allow; wrap as plain text. Do not turn into a table. |
| Q11 | Instructions contain emoji or Gujarati/Hindi text | Keep as typed in the copied message. |
| Q12 | User **adds a second subji** in one slot | **Both** subjis default to qty **2** (not 3 and 3). This does **not** apply to auto-added tindora (qty 1) with turya moong dal. |
| Q13 | User removes roti from a subji+roti slot | Remaining subji keeps its quantity, title, and wording. Copied message does not mention roti. |
| Q14 | Changing dish type (dal → subji) | Quantity switches to the new type default (dal 3 → subji 3). Title resets to the new catalog name. Do not keep a stale label. |
| Q15 | **Turya moong dal** selected | Add **tindora** at qty **1**. Dal stays 3, roti stays 13. If a normal subji is also present, tindora remains 1 (pairing rule wins over Q12). Titles default to catalog names; user may then edit them. |
| Q16 | Quantity is empty on copy (user cleared it and never filled) | Omit qty for that item, or prompt before approve. Do not invent 13/3/3. |
| T1 | User edits dish **title** | Copied message and UI show the new title. `mealId` / kind / rules stay the same (e.g. renamed choli is still lunch-only). |
| T2 | User clears the title | Fall back to the catalog name, or keep empty until they type — prefer **catalog name fallback** so the tiffin message is never blank. |
| T3 | User edits **wording** on an item | Include it in the copied message next to that item (plain text). Empty wording is omitted. |
| T4 | Title/wording in Gujarati, Hindi, or with emoji | Keep as typed. |
| T5 | **Generate Menu** overwrite | New dishes get catalog titles and empty wording unless the product explicitly keeps previous custom text (G2: prefer reset to catalog titles for replaced items). |
| T6 | Auto-added tindora (turya moong pairing) | Title defaults to “Tindora” (or catalog name) and is still user-editable. |

---

## 4. Approve and copy message

| ID | Case | Expected behaviour |
|---|---|---|
| A1 | User taps **Approve** with all 14 slots decided | Status → `APPROVED`. Build the **full-week** plain-text message. Copy to clipboard. |
| A2 | User taps **Approve** with some slots `UNDECIDED` | Do not treat this as a full-week send. Warn listing missing slots. User can still fill one slot and use **slot copy** (A14). Do not copy the entire week as if it were complete. |
| A3 | Copied message layout | Chat-style text. **No table.** |
| A4 | Clipboard API fails (permission, insecure context, old WebView) | Show the message on screen with a manual “Select all” so it can still be copied. |
| A5 | User already approved, then edits a meal | Move back to `UNDER_REVIEW`. Full-week copy should use the latest content; do not keep a stale approved snapshot unless “copy last approved” is explicit. |
| A6 | User copies more than once | Allowed. Re-copy the **same scope** (full week vs the slot just filled). No WhatsApp send. |
| A7 | Message template is customized | Placeholders (day, meal type, dish **title**, wording, qty, instructions) still fill correctly. Broken template should not crash; fall back to the default template. |
| A8 | Template hides quantities | Allowed if the user configured that. Defaults still exist in the app. |
| A9 | Template hides empty instructions | Default: skip empty notes. Skip empty per-item wording too. |
| A10 | Wednesday lunch in the message (not overridden) | Shows roti only, qty 13 — not “dal + subji + roti”. If overridden, show the chosen items. Use edited titles if the user changed them. |
| A11 | Item with no quantity (khichdi, or cleared field) | Show the dish name without a fake qty. |
| A12 | User is not on HTTPS / clipboard blocked | Same as A4. |
| A13 | Turya moong dal slot in the message | Includes tindora qty 1 plus dal qty 3 and roti qty 13. |
| A14 | Midweek: user fills a previously `UNDECIDED` slot, then copies | Clipboard contains **only that slot** (day + lunch/dinner), not the rest of the week. Same template, one meal. |
| A15 | Midweek: user fills **two or more** previously undecided slots, then copies once | Clipboard contains **only those newly filled slots**, still not already-decided days. |
| A16 | Midweek: user copies without filling an undecided slot (wants the whole week) | **Copy full week** is a separate action. Default after filling an undecided slot is slot-only copy (A14). |
| A17 | Midweek slot copy uses edited title/wording/qty | Same as full week: edited title, wording, qty rules apply to that slot only. |

---

## 5. Reminders (Android Chrome web push)

| ID | Case | Expected behaviour |
|---|---|---|
| N1 | Slot is `UNDECIDED` | Two notifications: **day before** and **same day**. |
| N2 | Slot is `DECIDED` before the day-before reminder | **No** notifications for that slot. |
| N3 | Slot is decided after the day-before reminder, before the same-day reminder | Same-day reminder **must not** fire. |
| N4 | Multiple undecided slots | One digest or a clear list of slots. Do not spam one notification per slot if several are open the same day — listing them is enough. |
| N5 | Wednesday lunch undecided | Reminders still apply to that slot (roti-only still counts as a slot that must be decided). |
| N6 | User never grants notification permission | App still works. Show an in-app banner that reminders are off. Do not crash. |
| N7 | User grants, then revokes permission in Chrome | Stop sending. Next visit, ask or explain how to turn them back on. |
| N8 | User did not Add to Home Screen | Notifications should still work in Android Chrome after permission. Home screen is optional. |
| N9 | Past slot (e.g. Monday dinner, it is already Tuesday) still `UNDECIDED` | Do not keep sending “day before / same day” forever. Same-day is the last automatic reminder for that slot. |
| N10 | Week not created at all (`NOT_CREATED`) | Treat all upcoming slots as undecided, or remind that the week has no menu. Same two-timing idea for the next meal(s). |
| N11 | Device is offline when the scheduled job runs | Push may be delayed until Chrome is online. Acceptable. Do not require WhatsApp. |
| N12 | Scheduled job runs twice | Must not duplicate the same slot reminder for the same day. |
| N13 | Time zones | Use the household local timezone (India). “Same day” is local calendar date, not UTC date. |
| N14 | iPhone | Out of scope. No extra work to support Safari/iOS push in V1. |

---

## 6. State, storage, and refresh

| ID | Case | Expected behaviour |
|---|---|---|
| S1 | User refreshes the tab | Current working week should still be there if local/session storage is used. If only in-memory, warn that refresh will lose work — prefer local persistence for the current week. |
| S2 | User clears site data / new phone | Menu is gone. That is acceptable for V1 (no database). Generate again. |
| S3 | Two Chrome tabs open | Last write wins, or sync via local storage. Do not silently keep two different approved menus. |
| S4 | Status `APPROVED` then **Generate Menu** | Confirm overwrite. New menu is `GENERATED` / `UNDER_REVIEW`, not still `APPROVED`. |
| S5 | No history store | Opening next week does not load last week. Repeats are fine. |
| S6 | Week boundary (Sunday night → Monday) | New week starts empty (`NOT_CREATED`) unless the user already generated next week. |

---

## 7. Android / website

| ID | Case | Expected behaviour |
|---|---|---|
| M1 | Phone in portrait, small screen | Full week usable: generate, change, qty, approve, copy. |
| M2 | Keyboard open while editing quantity, title, wording, or instructions | Fields stay visible; copy/approve not hidden forever behind the keyboard. |
| M3 | User opens `*.vercel.app` vs custom domain | Both work. Notifications permission is per-origin. |
| M4 | Add to Home Screen | Optional. App should work the same from a Chrome tab. |
| M5 | Play Store | Not required. Do not depend on a native install. |

---

## 8. Rule conflicts (priority)

When two rules could clash, apply in this order:

1. Vegetarian only  
2. No plain rice  
3. Default plate = roti + subji + dal, unless a more specific rule or user override  
4. Wednesday lunch = roti only **on generate**; suggestions allowed on override (C1)  
5. Choli and bhinda = lunch only  
6. Fansi is not a **default** lunch subji  
7. Turya moong dal → tindora qty 1 (pairing wins over Q12)  
8. Exactly one junk/tasty dinner on Friday **or** Saturday (generator only; user may override)  
9. Default staple set; default dal is Tuvar Dal / Gujarati Dal (not turya moong); no rajma/chole in generate / first suggestions  
10. Gujarati / staple ranking  
11. Same dish this week: **warn and allow** (C11)  
12. Repeats from last week allowed  

Example: choli is a default staple **and** lunch-only → use choli at lunch, never at dinner, even if dinner needs a default sabzi.

Example: fansi is a staple **but** not a lunch default → use fansi at dinner, not as auto lunch subji.

---

## 9. Out of scope (do not treat as V1 bugs)

- Last-week uniqueness / stored history  
- WhatsApp auto-send  
- Table-formatted copy  
- Native iOS/Android store app  
- Multi-user / two phones editing at once with a server  
- Nutritional advice, grocery ordering, AI as the generator  

---

## 10. Suggested test week (happy path)

Generate once and confirm:

- Most slots are **roti + subji + dal** (roti 13, subji 3, dal 3)  
- Wednesday lunch is roti only, qty 13, until the user overrides — then suggestions appear (C1)  
- No **fansi** on lunch unless the tester overrode it  
- Subji/dal/junk names come from **`Meal catalog.md`**  
- Generated default dal is **Tuvar Dal** or **Gujarati Dal**, not turya moong (G24)  
- Selecting **turya moong dal** (override) adds **tindora qty 1** (if those dishes are in the catalog or pairing still applies)  
- Choli and/or bhinda only appear at lunch  
- Exactly one of Friday/Saturday dinner is from catalog **Junk Food / Variety** (e.g. Pav Bhaji, Ragda Pattice)  
- No plain rice; khichdi/pulao only from catalog **Rice / one-pot** if overridden  
- No dishes outside `Meal catalog.md`  
- Quantity **> 20** is rejected  
- Cleared quantity stays empty  
- Adding a second subji sets **both** to 2  
- User can edit a dish **title** and **wording**; copy uses those edits; rules still use the catalog dish  
- Picking a dish already used this week shows a **warning** and still allows it  
- Copy is plain text, not a table  
- Midweek: filling an undecided slot and copying pastes **only that slot**, not the full week  
- Clearing one dinner and waiting would produce day-before + same-day reminders on Android after permission is granted  
