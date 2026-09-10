# Antigravity agent playbook — live Chrome extension QA

You are the **Google Antigravity browser sub-agent**. A human is **monitoring only**. You must complete every QA task in this file by driving the **Antigravity-managed Chrome** (the window with the Antigravity Browser Control extension). Do not stop at “the human should do this” unless a **GATE** says wait.

This is **not** a normal website. The product is a private unpacked MV3 extension named **Ai Chat Automation (Grok Update)** v5.0. Overlay buttons only appear after that extension is loaded from `dist/` **in the same Chrome you control**.

Paste this whole file into Antigravity agent chat. Use `/browser` if your Antigravity version requires it for browser control.

---

## 0. Fill this block before you start (human)

The monitor pastes secrets here, then hands you this file. Never write secrets into the repo, git, screenshots filenames, or `QA_RESULTS` text that gets committed.

```
SITE_URL=https://agents.moderationinterface.com
SITE_USER=
SITE_PASS=
OPENAI_API_KEY=sk-...
GROK_API_KEY=                 (leave empty unless Model is a grok-* option)
DIST_PATH=C:\20300\github\thai\dist
TEST_THREAD_HINT=             (name / URL / customer nickname of a LONG thread)
ALLOW_AUTO_SEND=no            (yes = one real Auto send is allowed on TEST_THREAD)
ALLOW_INSERT_AND_SEND=no      (yes = Insert & Send may fire once)
ALLOW_LEARN_SEND=no           (yes = Learn may send one typed message)
EXPECTED_OLD_COST_USD=0.006-0.012
```

If `SITE_USER` / `SITE_PASS` / `OPENAI_API_KEY` are empty: **GATE-SECRETS** — tell the monitor in chat, wait, then continue. Do not invent credentials.

---

## 1. Who you are and what success looks like

**Goal:** prove the packed `dist/` still works like Jan’s operator tool, costs less on a long thread, and still sounds like the same Slovenian player.

**Pass the job only if** you produce:

1. Screenshots for every task below
2. A filled **QA results** section (copy the template at the bottom into your final message)
3. Every checkbox marked `PASS`, `FAIL`, `BLOCKED`, or `SKIP` with evidence

**Not in scope:** rewriting code, Chrome Web Store, a new website, changing the 10s Auto delay, committing API keys.

---

## 2. Hard rules (do not violate)

1. Drive **Antigravity’s Chrome**, not a random everyday profile unless that is the same window the Browser Control extension is attached to.
2. Keep **two** extensions enabled: **Antigravity Browser Control** and **Ai Chat Automation (Grok Update)**. Never disable Browser Control.
3. Load unpacked folder **`DIST_PATH` only** (`...\thai\dist`). Never load the repo root or `src`.
4. `npm run dev` is **not** the live overlay. Ignore it.
5. Overlay lives on the **chat page**, not the popup. Popup lives at `chrome-extension://<EXT_ID>/index.html` (open as a **tab**, not the tiny toolbar popup).
6. **Do not send messages to customers** unless the matching `ALLOW_*` flag is `yes` **and** you are on `TEST_THREAD`.
   - **Suggest** = safe (does not send)
   - **Insert Text** = fills the box; avoid if you are unsure (it runs cleanup)
   - **Insert & Send** = can send / learn path — only if `ALLOW_INSERT_AND_SEND=yes`
   - **Auto** = **always sends** after a 10s countdown — only if `ALLOW_AUTO_SEND=yes`
   - **Learn** = saves example **and sends** whatever is in the textarea — only if `ALLOW_LEARN_SEND=yes`
7. If a real send is about to happen and the flag is `no`: **abort** (close the chat tab or navigate away during countdown). Then mark Auto send `SKIP` with screenshot of the countdown.
8. Do not click **Delete All** in History. Do not wipe Stats **Reset Before** unless you just created a bad snapshot.
9. Take a screenshot at every pass/fail. If the page is a login wall, 2FA, or file picker you cannot complete: **GATE** — one short message to the monitor, wait up to 2 minutes, retry.
10. Prefer **Suggest** for cost/ledger/quality. Use **Auto** only for the countdown task (and one send if allowed).
11. After every `npm run build` or extension **Reload**: hard-refresh the chat tab (`Ctrl+F5`).
12. Do not publish, pack for the store, or email anyone.

---

## 3. Human monitor — when to pause (GATE)

Post a single line: `GATE-<name>: <what you need>` and **wait**. Do not loop-click.

| GATE | You cannot continue until |
| --- | --- |
| `GATE-SECRETS` | Credentials / keys pasted in section 0 |
| `GATE-FILE-PICKER` | Monitor selects `DIST_PATH` in the Load unpacked dialog |
| `GATE-2FA` | Monitor completes site 2FA / captcha |
| `GATE-THREAD` | Monitor points you at a **long** customer thread (years of history). Empty chats lie about cost. |
| `GATE-SEND` | `ALLOW_AUTO_SEND` or Insert & Send is `no` but you still need a send — ask once |
| `GATE-POPUP-ID` | You cannot read the extension ID from `chrome://extensions` |

The monitor will not drive the test. They only unblock gates and watch.

---

## 4. Selectors and exact UI (use these)

### Chat host (`agents.moderationinterface.com`)

| What | How to find |
| --- | --- |
| Composer | `#chat-windows-message-textarea` |
| Overlay bar | `#mode-switcher` |
| Learn | `#mode-learn` (green) |
| Tag dropdown | `#learn-tag-select` |
| Suggest | `#mode-suggest` (black) |
| Auto | `#mode-auto` (black) |
| + Add / Report row | `#manual-suggestion-wrapper` |
| + Add | button text `+ Add` |
| Report | button text `🚩 Report Bad suggestion` |
| Suggestion card | `#ai-suggestion-card` containing `💬Suggested reply:` |
| Insert | `#insert-suggestion-btn` label **Insert Text** |
| Insert & Send | `#insert-send-suggestion-btn` label **Insert & Send** |
| Status banner | `#process-banner` (fixed top, blue) |
| Customer personals | `#customer-custom` |
| Player personals | `#moderator-custom` |
| Send | `button[type="submit"]` |
| Timeline | `li.ng-star-inserted` — agent rows have `timeline-inverted` |
| Multi-tab modal | `<app-multiple-tabs-modal>` — extension auto-clicks OK/disconnect. If it stays, click the **non-red** OK / disconnect button. Never click Logout. |

**Banners you will see**

- `Collecting messages, please wait...`
- `Please wait, getting suggestion...`
- `AI is auto-filling, please wait...`
- `Waiting time: 10 seconds...` down to `Waiting time: 1 seconds...` (required for Auto QA)
- `⚠️ Response too short Regenerating...` (allowed on **normal** tags if reply &lt; 70 Auto / &lt; 75 Insert; **must not** loop on trigger tags)

**Tag list** (dropdown must still contain all of these)

- `flirty`, `soft`, `question`, `Erotic`
- `flirty and soft`, `flirty and question`, `flirty and erotic`
- `soft and question`, `Soft and erotic`, `Question and erotic`
- `(trigger) Leere Nachricht`
- `(trigger) [kiss]`
- `(trigger) [heart]`
- `(trigger) [Klaps]`
- `(trigger) Please reactivate the user!`

**Trigger customer lines** (latest customer message). Any of:

- `[kiss]`
- `[heart]`
- `[Klaps]` / slap-like
- `(Leere Nachricht)`
- `[Please reactivate the user!]`

### Extension popup (open as a full tab)

1. `chrome://extensions`
2. Developer mode ON
3. Card **Ai Chat Automation (Grok Update)** version **5.0**
4. Copy **ID** (32-char string)
5. Open `chrome-extension://<ID>/index.html`

Title in UI: **GPT Chat Automation**

Tabs: **Settings** | **Stats** | **Errors**  
Top right: **Save** (on Settings), **History** (conversation list — do not Delete All)

**Settings must show**

- Card **System Prompt** (large textarea)
- Card **API Keys & Model**: OpenAI API Key (`sk-...`), Grok API Key (`xai-...`), Model dropdown
- Card **History lines sent to AI**: `All (old behavior)`, `20`, `40 (recommended)`, `60`, `80` — leave **40** unless quality fails
- Card **Learn Examples**: Normal Tags, Trigger Tags
- **Open DB Viewer**
- After edits: click **Save**

**Stats must show**

- Cost `$`, Model, Input Tokens, Output Tokens, Total Tokens
- **Before / after benchmark**: `Save as Before (baseline)`, `Save as After (updated)`, `Clear After`, `Reset Before`
- **Prompt ledger (approx)** table with rows including **Conversation history**, **Suggested flow**, **Bad responses**, **Previous AI replies**, **History lines**
- Before first generate: `No ledger yet. Run Suggest or Auto once...`

**Errors tab:** `No errors.` or a red `lastError` box.

### Console (service worker + page)

On trigger Suggest/Auto, page or background console should log:

`📊 personalsSkipped: true (trigger)`

Open: `chrome://extensions` → the extension card → **Service worker** / **Inspect views** if the UI offers it. Also open DevTools on the chat tab → Console.

---

## 5. Environment setup (do this first)

### 5.1 Allowlist the chat hosts

If Antigravity blocks navigation, add these to the browser allowlist (Windows typical path):

`%USERPROFILE%\.gemini\antigravity\browserAllowlist.txt`

```
agents.moderationinterface.com
chat.freedomgpt.com
localhost
127.0.0.1
```

Also allow `chrome://extensions` and `chrome-extension://` if your build requires it. Ask the monitor once if a navigation is blocked (`GATE-ALLOWLIST`).

### 5.2 Confirm `dist` exists

If you have a terminal in this repo:

```
npm run build
```

Confirm these files exist under `DIST_PATH`:

- `manifest.json`
- `background.js`
- `content.js`
- `index.html`
- `db-viewer.html`

If build fails: stop, paste the error, do not load a broken dist.

### 5.3 Load unpacked (TASK A)

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Screenshot the page
4. If **Ai Chat Automation (Grok Update)** already exists: click **Reload** on that card. If it points at the wrong folder, **Remove** it first, then Load unpacked.
5. **Load unpacked** → select `DIST_PATH`
6. If a native file dialog appears: **GATE-FILE-PICKER**
7. Confirm name **Ai Chat Automation (Grok Update)** and version **5.0**, status **Enabled**, no Errors badge
8. Screenshot the card including the **ID**
9. Write `EXT_ID=` into your notes
10. Pin is optional. You will use `chrome-extension://EXT_ID/index.html`

**Two copies of this extension = FAIL.** Remove duplicates.

**PASS:** extension card visible, enabled, version 5.0, ID recorded.  
**FAIL:** error on load, wrong folder, disabled.

---

## 6. Task list (run in order)

After each task: screenshot, mark PASS/FAIL/BLOCKED/SKIP, one-sentence evidence.

Wait up to **90 seconds** on banners `getting suggestion` / `auto-filling` / `Collecting messages`. If still spinning: Errors tab + extension Errors + screenshot, then FAIL that task.

---

### TASK B — Popup Settings (no chat yet)

1. Open `chrome-extension://<EXT_ID>/index.html`
2. Resize / screenshot so Settings is readable (UI is ~780px wide)
3. **Settings** tab
4. Confirm System Prompt textarea exists. Do **not** wipe Jan’s prompt. If empty, note it; do not invent a new personality.
5. Paste `OPENAI_API_KEY` into **OpenAI API Key**. If Model is `grok-*`, paste `GROK_API_KEY` into **Grok API Key**.
6. Leave Model as already selected unless it is blank; then pick a GPT model that matches the OpenAI key (not Grok without a Grok key).
7. Confirm **History lines sent to AI** is **40 (recommended)**
8. Confirm Learn Examples dropdowns exist
9. Click **Save**
10. Confirm **Open DB Viewer** button exists (clicking it is optional)

**PASS:** keys saved, History lines = 40, System Prompt + Learn Examples visible.  
**FAIL:** missing History lines control, Save does nothing, page is blank.

---

### TASK C — Popup Stats / Errors chrome (before generate)

1. Click **Stats**
2. Confirm Cost / Model / Input / Output / Total cards
3. Confirm benchmark buttons: Save as Before, Save as After, Clear After, Reset Before
4. Ledger may say **No ledger yet** — that is OK
5. Click **Errors** — should be empty or an old error. Screenshot. Do not fail on a stale error until you reproduce it.

**PASS:** Stats + ledger UI + Errors tab all present.

---

### TASK D — Log into the chat site

1. Open `SITE_URL`
2. Log in with `SITE_USER` / `SITE_PASS`
3. 2FA/captcha → `GATE-2FA`
4. If `<app-multiple-tabs-modal>` appears, wait 2s for auto-OK; else click OK/disconnect (not Logout)
5. You must reach an **inbox / conversation list**, not a login loop
6. Screenshot the logged-in shell (no passwords in frame)

**PASS:** logged in.  
**FAIL:** cannot leave login. **BLOCKED:** 2FA with no monitor.

---

### TASK E — Open a LONG thread (quality + cost)

1. `GATE-THREAD` if `TEST_THREAD_HINT` is empty or you only see new/empty chats
2. Open the long thread
3. Wait until `#chat-windows-message-textarea` exists
4. Wait up to 20s for `#mode-switcher`
5. If overlay missing: hard-refresh, wait 15s, retry once. Still missing: `chrome://extensions` Errors, screenshot, FAIL
6. Screenshot the composer + overlay

**Must be visible**

- `#mode-learn` Learn
- `#learn-tag-select`
- `#mode-suggest` Suggest
- `#mode-auto` Auto
- `#manual-suggestion-wrapper` with `+ Add` and `🚩 Report Bad suggestion`

**PASS:** overlay complete on a long thread.  
**FAIL:** overlay missing, or only an empty chat available (cost numbers would be invalid — mark cost tasks SKIP).

---

### TASK F — Overlay does not destroy host UI

1. Confirm the site’s own send button and textarea still work visually
2. Confirm timeline messages still show
3. Confirm `#customer-custom` / `#moderator-custom` still exist if this layout has personals boxes
4. Screenshot

**PASS:** host chat still usable.

---

### TASK G — Suggest on a normal (non-trigger) latest customer message

**Do not click Auto. Do not click Insert & Send. Do not click Learn.**

1. Confirm the latest customer bubble is **not** a trigger string
2. Tag dropdown can stay `flirty` (or whatever is selected)
3. Click **Suggest** (`#mode-suggest`)
4. Expect `#process-banner`: collecting / getting suggestion
5. Wait until `#ai-suggestion-card` shows `💬Suggested reply:` and Slovenian (or the player language) text
6. Confirm **Insert Text** and **Insert & Send** are both present
7. Screenshot the card
8. Click **Insert Text** once
9. Confirm `#chat-windows-message-textarea` contains the suggestion (or the overlay rebuilt after insert — screenshot either way)
10. **Do not send** unless `ALLOW_INSERT_AND_SEND=yes`

If suggestion is red error text: open popup **Errors**, screenshot, FAIL.

**PASS:** suggestion card + both insert buttons + non-empty Slovenian-like reply.  
**FAIL:** error card, overlay gone forever, English generic chatbot voice with no in-character continuity (note for quality task).

---

### TASK H — Cost / packing ledger (same generation as G)

1. Open `chrome-extension://<EXT_ID>/index.html` → **Stats** (refresh the tab if ledger still empty)
2. Screenshot **Stats** cards (Cost, Input Tokens)
3. Screenshot **Prompt ledger** table in full
4. Record:

```
input_tokens=
output_tokens=
cost_usd=
history_lines=
conversation_history_chars=
suggested_flow_chars=
bad_responses_chars=
previous_ai_chars=
final_system_chars=
```

5. **History lines** must be **≤ 40** (or equal to the Settings value). On a years-long thread, **FAIL if History lines is hundreds** (packing broken).
6. If Suggested flow / Bad responses / Previous AI are empty in storage, those ledger **chars should be 0**. FAIL if huge leftover dumps (thousands of chars) with no reason.
7. Compare `cost_usd` to `EXPECTED_OLD_COST_USD` (0.006–0.012).
   - Lower or in-band on a **long** thread: PASS (note the number)
   - Higher: FAIL packing-cost, still continue quality tests
   - Empty/short thread: SKIP cost comparison, say why
8. Click **Save as After (updated)** (this build is already packed; there is usually no true Before)
9. Screenshot the Before/after card (may say Before is missing — OK)

**PASS:** ledger exists, history window respected, After saved.  
**FAIL:** no ledger after a successful Suggest, or history dump unbounded.

---

### TASK I — Trigger path (Suggest, no send)

1. Find or wait for a thread whose **latest customer** line is a trigger (`[kiss]`, `[heart]`, `[Klaps]`, `(Leere Nachricht)`, `[Please reactivate the user!]`)
2. If none exist: `GATE-THREAD` — ask monitor to open a trigger conversation. Do **not** invent a fake customer message in a live paid chat.
3. Note `#customer-custom` and `#moderator-custom` values (screenshot)
4. Open DevTools Console on the chat tab
5. Click **Suggest**
6. Wait for suggestion card
7. Confirm `#learn-tag-select` moved to a `(trigger) ...` option **or** stayed a trigger tag
8. Screenshot suggestion (should be a short in-character reaction, not a “nice to meet you” intro)
9. Watch `#process-banner` for **at least 8 seconds** after the card appears. **FAIL** if `⚠️ Response too short Regenerating...` loops on a trigger
10. Re-check personals boxes — they must **not** be wiped/rewritten into a huge new block in the same second (trigger skips personals OpenAI). Mild no-op is PASS.
11. Console: look for `personalsSkipped: true (trigger)` — PASS if present; if you cannot open the service worker, note `BLOCKED-CONSOLE` but do not fail the whole job if suggestion still worked

**PASS:** trigger suggestion, no regenerate loop, personals not clobbered.  
**SKIP:** no trigger thread after gate.

---

### TASK J — 10 second Auto countdown

**This will send if you let the timer finish.**

1. Stay on `TEST_THREAD` only
2. If `ALLOW_AUTO_SEND=no`: you will **abort before send** (step 7)
3. Click **Auto** (`#mode-auto`)
4. Wait through `AI is auto-filling, please wait...` until text appears in the textarea **and** banner `Waiting time: 10 seconds...`
5. Screenshot `Waiting time: 10 seconds...` then again around `Waiting time: 5 seconds...`
6. Confirm the delay is **about 10 seconds**, not instant send
7. If `ALLOW_AUTO_SEND=no`: **before** `Waiting time: 1` finishes, close the tab or navigate to `chrome://extensions` to abort send. Screenshot abort. Mark send `SKIP`, countdown `PASS` if you saw 10→5.
8. If `ALLOW_AUTO_SEND=yes`: let it send once. Confirm a new **You** / `timeline-inverted` bubble. Then click **Suggest** (not Auto) so Auto does not keep running. Screenshot.

**PASS:** countdown banners 10…1 exist; send only if allowed.  
**FAIL:** send is instant (no `Waiting time:` banners). That is a product regression.

---

### TASK K — Auto does not stay armed after the test

1. After Task J, `#mode-suggest` should be usable; you must **not** leave Auto running unattended
2. Refresh the chat tab if Auto still looks active (`#mode-auto` has class `active` and keeps generating)
3. Screenshot mode-switcher showing Suggest selected or Auto not looping

**PASS:** no unattended Auto loop left running.

---

### TASK L — Quality gate (Jan’s bar)

Using the **Suggest** text from Task G (and I if you have it), judge:

| Check | Pass if |
| --- | --- |
| Language | Slovenian (or clearly the player’s language), not generic English support-bot |
| Continuity | Does **not** restart “get to know you” / first-date on a years-old thread |
| Personals | Uses known player vs customer facts when those boxes have data |
| Trigger (if I ran) | Short human reaction, not a long essay, not a copied example dump |
| Human-likeness | Would not look like an instant robot if Auto waited 10s |

If quality is bad:

1. Popup Settings → History lines → **All (old behavior)** (`value 0`)
2. **Save**
3. `chrome://extensions` → **Reload** the extension
4. Chat tab **Ctrl+F5**
5. Repeat **one** Suggest on the same long thread
6. Screenshot old vs new suggestion
7. If All (0) is clearly better: report `QUALITY-REGRESSION-ON-40` and keep All as the recommended workaround. Do **not** revert code.
8. If still bad: FAIL quality, paste both samples.

**PASS:** in-character on window 40, or documented All(0) workaround with evidence.

---

### TASK M — Errors after the session

1. Popup **Errors** tab — screenshot
2. `chrome://extensions` → this extension → **Errors** — screenshot (none is PASS)
3. Chat DevTools Console — note red errors related to `content.js` / extension (ignore site ads)

**PASS:** no new extension errors from your clicks.

---

## 7. Do **not** do these unless a flag is yes

| Action | Why |
| --- | --- |
| Learn with text in the box | Sends to the customer |
| Insert & Send | Sends |
| Auto left on | Hours of paid replies on a live person |
| Typing into the live composer as the player | You are not Jan |
| Changing System Prompt contents | Personality regression |
| Reset Before / Delete All | Destroys evidence |
| Testing on `chat.freedomgpt.com` | Only if monitor says the session is there |

Optional FreedomGPT host if monitor instructs: `https://chat.freedomgpt.com` — same overlay IDs if the composer id matches.

---

## 8. Recovery

| Symptom | Fix |
| --- | --- |
| No overlay | Reload extension, Ctrl+F5 chat, confirm host is allowed, confirm dist not src |
| Overlay looks old | Stale content script — Reload + Ctrl+F5 |
| Suggest red error | Errors tab; missing API key; wrong model vs key |
| File picker | GATE-FILE-PICKER |
| Two overlays / fighting buttons | Two extension copies — remove one |
| Instant Auto send | FAIL Task J; stop Auto |
| History lines hundreds | FAIL packing; still finish quality |
| Quality drop on 40 | Task L All(0) retest |

---

## 9. Final report (paste this filled)

```
EXT_ID:
THREAD_USED: (long / empty / trigger)
ALLOW_AUTO_SEND observed:

TASK A Load unpacked: PASS/FAIL — 
TASK B Settings + keys: PASS/FAIL — 
TASK C Stats chrome: PASS/FAIL — 
TASK D Login: PASS/FAIL — 
TASK E Overlay on long thread: PASS/FAIL — 
TASK F Host UI intact: PASS/FAIL — 
TASK G Suggest + Insert Text: PASS/FAIL — 
TASK H Ledger + cost: PASS/FAIL/SKIP —
  input_tokens:
  cost_usd:
  history_lines:
  vs old 0.006-0.012:
TASK I Trigger Suggest: PASS/FAIL/SKIP —
  personalsSkipped console: yes/no/blocked
  regenerate loop: yes/no
TASK J 10s countdown: PASS/FAIL —
  send fired: yes/no
TASK K Auto disarmed: PASS/FAIL —
TASK L Quality: PASS/FAIL —
  History lines used: 40 / All(0)
  Notes:
TASK M Errors: PASS/FAIL —

OVERALL: PASS / FAIL
TOP ISSUES:
1.
2.
```

Attach screenshots in order A→M. Then stop. Do not start coding unless the monitor asks.
