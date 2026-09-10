# Implementation progress

Living log of completed Cursor tasks. **Append a section after every task.** Do not overwrite older entries.

Status: All Cursor tasks 01–15 done. Remaining work is live-site QA with Jan (see `QA_CHECKLIST.md`).

---

## TASK 01 — Packing helper module (2026-09-10)

**Goal:** Baseline helpers + smoke tests. No Suggest/Auto behavior change.

**Files**
- Added `src/promptPacking.js`: `chars`, `approxTokens`, `isBlank`, `omitEmptySection`, `capList`, `isTriggerTag`, `isTriggerCustomerMessage`, `windowHistory`
- Added `scripts/check-packing.mjs`
- `eslint.config.js`: `chrome` global, Node globals for Vite, ignore leftover `App copy.jsx` / `AppLEGACY.jsx` / `BackhroundLEGACY.js`
- Small unused-var nits in `App.jsx`, `content.js`, `db.js` so lint can pass

**Not wired** into `background.js` yet.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 02 — Token ledger (2026-09-10)

**Goal:** Measure prompt size per section. Do not cut what is sent.

**Files**
- `src/background.js`: import packing helpers; after `finalSystemMessage` is built, save `lastPromptLedger` to `chrome.storage.local` + IndexedDB. Grok extra “don’t mention character count” line updates `finalSystemMessage` in the ledger. Ledger is saved even if the API key is missing.
- `src/App.jsx` Stats: existing cost/token cards plus **Prompt ledger (approx)** table (chars + approx tokens per section, history line count)

**Prompt sent to the model:** unchanged.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 02B — Before / after benchmark snapshots (2026-09-10)

**Goal:** Freeze a Before baseline and a later After so we can compare. `lastPromptLedger` / `lastUsageStats` are overwritten every generation.

**Files**
- `src/promptPacking.js`: `delta(before, after)`, `pctChange(before, after)`
- `scripts/check-packing.mjs`: 10000 → 6000 is −4000 and −40%
- `src/App.jsx` Stats:
  - **Save as Before (baseline)** / **Save as After (updated)** — copy current usage + ledger + settings; no OpenAI call
  - **Clear After** / **Reset Before**
  - Comparison table when both exist: API input/output/total tokens, cost, history lines/chars/approx tokens, final system chars/approx tokens, saved-at
  - Cost and input-token deltas are green when After is lower
- Storage keys: `benchmarkBefore`, `benchmarkAfter` (`chrome.storage.local` + IndexedDB)

**How to use (live site):** long chat → Suggest/Auto → Save Before → do packing tasks → same kind of chat → Save After.

**Prompt sent to the model:** unchanged.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 03 — Omit empty prompt sections (2026-09-10)

**Goal:** Do not send empty wrapper blocks for examples, suggested flow, bad responses, or previous AI replies.

**Files**
- `src/background.js`: `omitEmptySection` + `listBody()` for those four lists. Empty → `""` (no `BAD RESPONSES TO AVOID` header). Non-empty lists still wrapped and included. Ledger measures the actual sent strings (0 chars when omitted).

**Unchanged:** system prompt, length lock, personals, gender, full history dump, date, trigger.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 04 — Cap expensive lists in the reply prompt (2026-09-10)

**Goal:** Even if storage still holds 120 items, the reply prompt only sends the newest few.

**Files**
- `src/promptPacking.js`: exported `MAX_PREV_AI = 5`, `MAX_BAD = 3`, `MAX_SUGGEST_FLOW = 3`
- `src/background.js`: `capList` on `lastAISuggestion`, `badResponses`, `suggestions` before `omitEmptySection`
- `scripts/check-packing.mjs`: constants exist; 120 previous AI replies → last 5

**Unchanged:** Learn tags, example sampling, stored array sizes (TASK 05 caps growth).

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 05 — Stop + Add / Report unbounded growth (2026-09-10)

**Goal:** Those arrays cannot grow past 10 items going forward. Prompt still only *sends* last 5 / 3 (TASK 04).

**Files**
- `src/content.js`: `pushToBoundedArray` limits
  - `lastAISuggestion` 120 → **10**
  - `suggestions` 120 → **10**
  - `badResponses` 120 → **10**

**Unchanged:** + Add and Report buttons still there; Learn / Suggest / Auto / 10s delay untouched.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 06 — History window packing (2026-09-10)

**Goal:** Main cost cut. Send a recent history window, not the full years-long scrape. Do not truncate to 10 lines.

**Files**
- `src/promptPacking.js`: `DEFAULT_HISTORY_LINES = 40`, `resolveHistoryMaxLines`, `packConversationHistory` (same “latest to oldest / don’t repeat intros” wrapper). `maxLines = 0` sends all lines. Empty history → `""`.
- `src/background.js`: reads `historyMaxLines` from storage (default 40). Ledger `historyLineCount` is the **packed** count, not the full scrape.
- `scripts/check-packing.mjs`: 100→40; `0`→100; empty→empty string

**Unchanged:** `grabData` still scrapes the full timeline. Popup control for this setting is TASK 07. Until then, default 40 applies unless `historyMaxLines` is already in storage (Stats snapshot already stores it).

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 07 — Popup control for history window (2026-09-10)

**Goal:** Jan can choose how many history lines go to the AI without editing storage by hand.

**Files**
- `src/App.jsx` Settings (above Learn Examples): **History lines sent to AI** — All (0), 20, 40, 60, 80. Default 40. Helper text: All = old behavior; 40 recommended; personals still hold long-term facts. Saved on change and on **Save** as `historyMaxLines`. Load path already existed from TASK 02B.

**Unchanged:** other settings; Learn / Suggest / Auto.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 08 — Skip personals AI call on triggers (2026-09-10)

**Goal:** Picture / kiss / heart / Klaps / reactivate messages should not pay for personals JSON extraction.

**Files**
- `src/promptPacking.js`: `triggerTagFromMessage`, `latestCustomerText`; `isTriggerCustomerMessage` now delegates to the mapper
- `src/background.js` `processPersonalsWithAI`: if latest customer line is a trigger, set `selectedTag`, keep existing personals, return success with `personalsSkipped: true` **before** any OpenAI call
- `scripts/check-packing.mjs`: kiss/heart/Leere/reactivate/slap → exact trigger tags

**Unchanged:** non-trigger messages still run structured extraction.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 09 — Skip personals AI when no new facts (2026-09-10)

**Goal:** Short chit-chat should not pay for personals extraction. When unsure, still call AI.

**Files**
- `src/promptPacking.js`: `looksLikeNewPersonalFact` — false for ok/haha/short greetings and triggers; true for age/city/job cues or anything that is not clearly chit-chat
- `src/background.js`: after trigger skip, if no new facts, reuse stored personals + `selectedTag`, return success with `personalsSkipped: true`
- `scripts/check-packing.mjs`: ok/haha skip; age and long Slovenian fact lines extract

**Unchanged:** trigger path from TASK 08; extraction for real new facts.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 10 — Shorter first-message on established chats (2026-09-10)

**Goal:** Year-long threads should not get “start with get-to-know questions.”

**Files**
- `src/promptPacking.js`: `firstMessagePrompt({ conversationStart, established })`, `ESTABLISHED_HISTORY_MIN = 8`. Established: start date + don’t repeat intros + nickname only if still unknown. New chats keep the full onboarding block.
- `src/background.js`: uses established variant when packed history length > 8
- `scripts/check-packing.mjs`: established text is shorter; start date and nickname rule remain

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 11 — Compress date + trigger static text (2026-09-10)

**Goal:** Smaller static prefix; same rules.

**Files**
- `src/background.js`: `datePrompt` compressed (still: two timestamps only, daypart, gap buckets, greet-when-long, never reveal time machinery, work-hour check-ins, 1–2 line time touch). `triggerPrompt` compressed (Leere Nachricht, reactivate, kiss, heart, Klaps/slap). **Gender/grammar block left unchanged.**

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 12 — Don’t regenerate short trigger replies (2026-09-10)

**Goal:** Kiss/heart/reactivate replies can be short without a second paid generation.

**Files**
- `src/content.js`: `skipShortRegenerate()` — true if `selectedTag` is a trigger tag or latest `currentMessage` is a trigger. Auto `<70` and Suggest insert `<75` regenerate only when that is false. 10s Auto countdown unchanged.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 13 — Prefer recent Learn examples (2026-09-10)

**Goal:** Style examples should follow Jan’s current voice, not 2-year-old Learn rows.

**Files**
- `src/promptPacking.js`: `sampleRandomN`, `recentThenSample(arr, n, multiplier=3)` — sample from the last `n*3` items; if the pool is smaller than `n`, use the full array
- `src/background.js`: non-trigger tags use `recentThenSample`; trigger tags still `pickRandomN` on the full tagged pool
- `scripts/check-packing.mjs`: 30-item pool, n=5 → values from 16–30

**Unchanged:** Learn UI, tag list.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 14 — Don’t mention character counts (OpenAI + Grok) (2026-09-10)

**Goal:** Replies must not include “(XX CHARACTERS)” for either provider.

**Files**
- `src/background.js`: the Grok-only extra line is now appended to `finalSystemMessage` for **both** OpenAI and Grok, before the ledger save. Length targeting (fixed/range/random/variation) unchanged.

**Checks:** `check-packing.mjs` pass · lint pass · build pass

---

## TASK 15 — Final gate + QA checklist (2026-09-10)

**Goal:** Confirm the build is green and hand off a human QA list. No product code changes.

**Files**
- Added `QA_CHECKLIST.md`

**Verified dist outputs:** `background.js`, `content.js`, `index.html`, `manifest.json`, `db-viewer.html`

**Checks:** `check-packing.mjs` pass · lint pass · build pass

**Not done in Cursor:** live login, long-thread Before/After cost comparison, Auto unattended, “still feels like the same player.”

---
