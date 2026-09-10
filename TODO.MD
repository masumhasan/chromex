# Cursor agent task list — Project 1

Use this file as the **runbook**. Paste **one TASK** into a new Cursor Agent chat (or the next turn). Do not paste two tasks at once.

**Goal:** cheaper input tokens, same Chrome extension workflow (Learn / Suggest / Auto / prompt box / tags).  
**Not in scope:** new website, Chrome store, replacing the tag system, removing the 10s Auto delay, switching reply model, committing secrets.

---

## Standing rules (include with every task)

Paste this block together with the task:

```
STANDING RULES
- Work only in this repo. Do not rewrite the product. Do not remove Learn, Suggest, Insert, Insert & Send, Auto, tags, or the system prompt editor.
- Do not change the 10s Auto send delay.
- Do not commit API keys. Ignore leftover files with secrets (`src/App copy.jsx`).
- After ANY code change, you MUST:
  1. Run: npm run lint
  2. Run: npm run build
  3. If lint or build fails, fix it and re-run both until they pass.
  4. If you added/changed `scripts/check-packing.mjs`, also run: node scripts/check-packing.mjs
  5. Do not mark the task done while lint or build is red.
- Quote the lint and build results in your summary (pass/fail).
- Keep changes scoped to THIS task only. No drive-by refactors.
```

---

## How to run a task

1. Copy **Standing rules** + **one TASK** (from the heading through “Done when”).
2. Send to the Agent.
3. Wait until lint + build pass.
4. Only then start the next task.

---

## TASK 01 — Baseline: lint, build, packing helper module

**Do this first. No behavior change for Suggest/Auto yet.**

Create a small pure module the later tasks will use, plus a smoke script.

**Create `src/promptPacking.js`** with exported helpers (implement for real, not stubs):

- `chars(str)` — string length, treat null/undefined as 0
- `approxTokens(str)` — `Math.ceil(chars(str) / 4)`
- `isBlank(str)` — true if missing or only whitespace
- `omitEmptySection(title, body)` — if body is blank, return `""`; else return a short wrapped block with the title and body
- `capList(arr, max)` — last `max` items of an array; if not an array, `[]`
- `isTriggerTag(tag)` — true if string starts with `(trigger)`
- `isTriggerCustomerMessage(text)` — detect Leere Nachricht / Please reactivate / [kiss] / [heart] / [Klaps] / [slap] (case-insensitive, same events as `background.js` / `content.js`)
- `windowHistory(lines, maxLines)` — if `lines` is not an array, `[]`; if `maxLines` is 0 or missing, return all lines; else return the **first** `maxLines` items (history is stored latest-first)

**Create `scripts/check-packing.mjs`** that imports those helpers and `console.assert`s:

- blank section omitted; non-blank section included
- capList of 10 items with max 3 returns 3
- trigger detection true for `[kiss]` and `(Leere Nachricht)`
- windowHistory of 100 lines with max 40 returns 40
- approxTokens of a 40-char string is 10

At the end: `console.log("check-packing: ok")` and exit 1 on assertion failure.

Do **not** wire this into `background.js` yet.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** smoke script prints ok; lint pass; build pass; Suggest/Auto behavior unchanged.

---

## TASK 02 — Token ledger (measure only, no packing cuts)

**Depends on TASK 01.**

In `src/background.js` `gptChat()`, after `finalSystemMessage` is built (existing concatenation, do not change what is sent yet):

1. Import helpers from `./promptPacking.js` (Vite already bundles the SW; keep `type: module` working).
2. Build a `promptLedger` object with `chars` + `approxTokens` for: `system`, `messageLength`, `firstMessage`, `personals`, `genderPrompt`, `conversationHistory`, `examples`, `suggestMsg`, `badResponses`, `prevGenText`, `datePrompt`, `triggerPrompt`, `finalSystemMessage`, plus `historyLineCount` from `messages`.
3. `chrome.storage.local.set({ lastPromptLedger: promptLedger })` and also `setItem("lastPromptLedger", promptLedger)` like other stats.
4. Log the ledger with `console.log`.
5. Do **not** omit or cap any sections yet.

In `src/App.jsx` Stats tab, show the ledger if present (section name, chars, approx tokens). Keep existing cost/token stats.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** Stats can show a breakdown after a generation (code path present); lint+build pass; prompt content still the same as before this task.

---

## TASK 02B — Before / after benchmark snapshots

**Depends on TASK 02. Do this before TASK 03** so the first “Before” snapshot is still the unoptimized prompt.

Jan’s success bar is cheaper on a *long* thread. `lastPromptLedger` and `lastUsageStats` are overwritten every generation — that is **not** a benchmark. We need a frozen Before and a later After.

### Store (chrome.storage.local + IndexedDB, same pattern as other stats)

Each snapshot:

```
{
  label: "before" | "after",
  savedAt: ISO timestamp,
  usage: lastUsageStats or null,   // cost, model, promptTokens, completionTokens, totalTokens
  ledger: lastPromptLedger or null, // section chars + approxTokens + historyLineCount
  settings: { historyMaxLines, learnExamplesLimit, triggerLearnExamplesLimit, openaiModel, msgLenMode, msgVarEnabled }
}
```

Keys: `benchmarkBefore`, `benchmarkAfter`.

### Stats tab UI

1. Show **current** generation (already from TASK 02): cost + ledger.
2. Buttons (only copy current stats into a snapshot — do not call OpenAI):
   - **Save as Before (baseline)**
   - **Save as After (updated)**
   - **Clear After** (so a new After can replace it; do not clear Before unless there is an explicit “Reset Before”)
3. Comparison table when both exist:

| Metric | Before | After | Delta |
| --- | --- | --- | --- |
| Input tokens (API) | | | after − before, and % |
| Output tokens | | | |
| Total tokens | | | |
| Cost $ | | | |
| History lines sent | | | |
| History chars / approx tokens | | | |
| Final system chars / approx tokens | | | |
| Saved at | | | |

Highlight cost and input-token % in green if After is lower.

4. Helper text: “Generate once on a long chat, Save Before. After packing tasks, generate on the same kind of chat, Save After.”

### Helpers

Put `delta(before, after)` and `pctChange(before, after)` in `src/promptPacking.js`. Smoke-test: 10000 → 6000 is −4000 and −40%.

Do **not** change what `gptChat` sends.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** Before/After can be saved from Stats without a new API call; comparison shows deltas; lint+build pass.

---

## TASK 03 — Omit empty prompt sections

**Depends on TASK 02 and TASK 02B** (save **Before** on a long thread *after* 02B, *before* this task, if you have live access).

In `src/background.js` `gptChat()`, when concatenating `finalSystemMessage`:

- Use `omitEmptySection` (or equivalent) so **examples**, **suggested flow**, **bad responses**, and **previous AI responses** are **not** added if their lists are empty.
- Do not send wrapper headers like `BAD RESPONSES TO AVOID` with no items.
- Keep system prompt, length lock, personals, gender, history, date, trigger as they are for now (history still full dump).
- Ledger must still reflect what was actually sent (empty omitted blocks = 0).

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** empty lists add zero characters; non-empty lists still included; lint+build pass.

---

## TASK 04 — Cap expensive lists in the reply prompt

**Depends on TASK 03.**

In `src/background.js` `gptChat()` before building those sections:

- `lastAISuggestion` / previous generations: use only the **last 5** (capList).
- `badResponses`: last **3**.
- `suggestions` (suggested flow): last **3**.
- Still omit entirely if the capped list is empty (TASK 03).
- Add constants at the top of `promptPacking.js` (`MAX_PREV_AI = 5`, `MAX_BAD = 3`, `MAX_SUGGEST_FLOW = 3`) and export them. Update `scripts/check-packing.mjs` to assert the constants exist and capList respects them.

Do not change Learn tags or example sampling yet.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** a storage array of 120 previous AI replies would only send 5; lint+build pass.

---

## TASK 05 — Stop + Add / Report from unbounded growth

**Depends on TASK 04.**

In `src/content.js`:

- `pushToBoundedArray("suggestions", ...)` max **10** (not 120).
- `pushToBoundedArray("badResponses", ...)` max **10**.
- `pushToBoundedArray("lastAISuggestion", ...)` max **10** (prompt still uses last 5).
- Do **not** remove the + Add or Report buttons.
- Do **not** change Learn, Suggest, Auto, or the 10s delay.

**Then:** `npm run lint` && `npm run build`  
(If packing script still exists, run it too.)

**Done when:** those three arrays cannot grow past 10 new items; buttons still there; lint+build pass.

---

## TASK 06 — History window packing (core cost cut)

**Depends on TASK 04.**

This is the main savings. Do **not** hard-truncate to 10 lines.

In `src/promptPacking.js`:

- `DEFAULT_HISTORY_LINES = 40`
- `packConversationHistory(lines, maxLines)` — apply `windowHistory`, then format the existing “latest to oldest / don’t repeat intros” wrapper. If no lines, omit (empty string).
- Keep a way to send **all** lines when `maxLines` is `0` (debug / A/B).
- Extend `scripts/check-packing.mjs` for: 100 lines → 40; maxLines 0 → 100; empty → empty string.

In `src/background.js`:

- Read `historyMaxLines` from `chrome.storage.local` (default 40). `0` means full history.
- Use `packConversationHistory` instead of joining the full `messages` array.
- Ledger must record `historyLineCount` **after** packing and chars of the packed block.

Do not change `grabData` scrape/scroll. We still collect the timeline; we send a window.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** default generations send ~40 latest history lines; setting 0 restores full dump; lint+build pass.

---

## TASK 07 — Popup control for history window

**Depends on TASK 06.**

In `src/App.jsx` Settings (near Learn Examples):

- Label: **History lines sent to AI**
- Select or numeric: `0` (All), `20`, `40`, `60`, `80`
- Default 40
- Load/save `historyMaxLines` with the other settings (include in Save and in the initial `chrome.storage.local.get`)
- Helper text: “All = old behavior. 40 is recommended for long chats. Personals still provide long-term facts.”
- Do not remove other settings.

**Then:** `npm run lint` && `npm run build`

**Done when:** Save persists `historyMaxLines`; UI matches storage; lint+build pass.

---

## TASK 08 — Skip personals AI call on deterministic triggers

**Depends on TASK 02+ (background still handles processPersonals).**

In `src/background.js` `processPersonals` handler (and/or `processPersonalsWithAI`):

- If the latest customer message (first history line / newest customer text) matches `isTriggerCustomerMessage`:
  - Map to the matching `(trigger) …` tag (Leere Nachricht, kiss, heart, Klaps, Please reactivate the user)
  - **Do not** call OpenAI for extraction
  - Keep existing `customerPersonal` / `moderatorPersonal` unchanged
  - Still set `selectedTag` to that trigger tag and respond with `personalsResponse` success
- Non-trigger messages: existing AI extraction unchanged
- Log when a call was skipped (`personalsSkipped: true` on ledger or console)

Add mapping tests in `scripts/check-packing.mjs` (kiss → `(trigger) [kiss]`, etc.). Put `triggerTagFromMessage(text)` in `promptPacking.js`.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** trigger events do not pay for personals JSON; normal messages still extract; lint+build pass.

---

## TASK 09 — Skip personals AI call when nothing new to extract

**Depends on TASK 08.**

In `src/promptPacking.js` add `looksLikeNewPersonalFact(latestCustomerText)` — heuristic true if the message mentions age-like numbers with age words, city/job/name cues, or is reasonably long **and** not a trigger. False for very short chit-chat / greetings / yes-no. Keep it conservative: **when unsure, return true** (still call AI). Document the heuristic in a short comment.

In `processPersonalsWithAI` path: if trigger skip already handled, stop. Else if `looksLikeNewPersonalFact` is false, reuse stored personals + stored tag, skip OpenAI, still return success so the UI does not break.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** short “ok” / “haha” style lines skip extraction; messages with new facts still extract; lint+build pass.

---

## TASK 10 — Don’t use first-message onboarding on established chats

**Depends on TASK 06.**

In `src/background.js` first-message / nickname block:

- If packed history has **more than 8 lines** (or conversation is clearly ongoing), use a **short** block: conversation start date only + “do not repeat intros / already-discussed topics / nickname rule only if name still unknown.”
- If history is short, keep the current fuller first-message instructions.
- Put the two variants in `promptPacking.js` (`firstMessagePrompt({ conversationStart, established })`) and unit-check: established text is shorter than new-chat text.

Do not delete nickname / real-name rules entirely.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** long threads send a shorter first-message block; new threads keep the full one; lint+build pass.

---

## TASK 11 — Compress static date + trigger appendices (keep meaning)

**Depends on TASK 10.**

In `src/background.js`, shorten `datePrompt` and `triggerPrompt` **without removing rules**:

- Keep: botNow vs last message, greeting when gap is long, never reveal timestamps, work-hours check-in, trigger list (Leere Nachricht, kiss, heart, Klaps, reactivate).
- Cut repetition and examples that duplicate the system prompt.
- Gender/grammar block: **do not delete**. Only trim duplicated sentences if clearly redundant. If unsure, leave gender block unchanged.
- Ledger should show smaller `datePrompt` / `triggerPrompt` chars.

**Then:** `npm run lint` && `npm run build`

**Done when:** those two strings are shorter; rules still present; lint+build pass.

---

## TASK 12 — Don’t regenerate short trigger replies

**Depends on TASK 08.**

In `src/content.js`:

- Auto path: if payload message is a **trigger-style** reply context OR selected tag is a trigger tag, **do not** regenerate just because length < 70.
- Suggest insert / insert-and-send: same for < 75 on trigger tags.
- Non-trigger: keep current short-reply regenerate.
- 10s Auto countdown **unchanged**.

You may read `selectedTag` from storage. Be defensive if storage is missing.

**Then:** `npm run lint` && `npm run build`

**Done when:** trigger replies can be short without a second paid call; normal replies still regenerate if too short; delay unchanged; lint+build pass.

---

## TASK 13 — Prefer recent Learn examples

**Depends on TASK 01.**

In `src/background.js` example sampling:

- Keep `pickRandomN` and tag filtering.
- Change the pool for normal (non-trigger) tags: take the **most recent** `finalLearnLimit * 3` matching examples (end of the training array), then `pickRandomN` from that slice. If fewer than needed, use the full tagged pool as today.
- Trigger tags: keep current small random sample (no change required).
- Do not change the Learn UI or tag list.

Add `recentThenSample(arr, n, recentWindowMultiplier = 3)` to `promptPacking.js` + smoke tests.

**Then:** `node scripts/check-packing.mjs` && `npm run lint` && `npm run build`

**Done when:** sampling prefers newer examples; fallback still works; lint+build pass.

---

## TASK 14 — Grok/OpenAI: never mention character counts in the user-visible reply

**Depends on earlier gptChat work.**

- Keep the Grok extra line that forbids `(XX CHARACTERS)` in the reply.
- Also append the same one-line constraint for **OpenAI** replies (not only Grok).
- Do not change length targeting (fixed/range/random/variation).

**Then:** `npm run lint` && `npm run build`

**Done when:** both providers get the “don’t mention character count” rule; lint+build pass.

---

## TASK 15 — Final gate: lint, build, regression checklist

**No new features.**

1. Run `node scripts/check-packing.mjs`, `npm run lint`, `npm run build`. Fix anything red.
2. Confirm `vite` build outputs `dist/background.js`, `dist/content.js`, `dist/index.html`, `dist/manifest.json`, `dist/db-viewer.html`.
3. Write a short `QA_CHECKLIST.md` with a human checkbox list (not code):
   - Learn / Suggest / Insert / Insert & Send / Auto still present
   - 10s Auto wait still there
   - History lines setting exists
   - Stats show cost + ledger + Before/After comparison if snapshots exist
   - Triggers skip personals call
   - Short trigger replies do not auto-loop
   - Load unpacked `dist/`
4. Do not commit unless the user asks.

**Done when:** all three commands pass; `QA_CHECKLIST.md` exists; summary lists remaining live-site tests Jan must do.

---

## After all tasks (human / live site — not an agent coding task)

These cannot be finished by Cursor alone:

- Load `dist` unpacked, log into Jan’s site
- Long thread, one Suggest/Auto → **Save as Before**
- After TASK 03–14, same kind of long thread → **Save as After**
- Compare Stats table (input tokens, $, history lines) vs old ~$0.006–$0.012
- Trigger message + Auto unattended
- Confirm replies still feel like the same Slovenian player

If quality drops, set **History lines → All (0)** and retest before reverting other phases.

---

## Paste order (copy this into your notes)

```
01 packing helpers + smoke script
02 token ledger + stats UI
02B before/after benchmark snapshots
03 omit empty sections
04 cap prev AI / bad / suggestions in prompt
05 cap content.js array growth
06 history window packing
07 popup historyMaxLines
08 skip personals on triggers
09 skip personals on no-new-facts
10 shorter first-message on established chats
11 compress date/trigger static text
12 no short-regenerate on triggers
13 recent Learn example sampling
14 don’t mention char counts (OpenAI too)
15 final lint/build + QA_CHECKLIST.md
```
