# Project Context — Ai Chat Automation (Grok Update)

> Chrome MV3 extension (`package.json` name: `aichat`, manifest name: **Ai Chat Automation (Grok Update)** v5.0) that injects AI reply tooling into anonymous chat-moderation pages. Operators use Learn / Suggest / Auto modes; a background service worker calls OpenAI or xAI (Grok) to draft replies, extract personal-info fields, and classify tone tags. Default reply language is **Slovenian**. The repo folder is `thai`; that is the workspace name, not the product language.

This file is a full-context dump for humans and agents. The stock `README.md` is still the unused Vite React template and is **not** accurate.

---

## 1. What this product does

The extension overlays a small control bar on the host chat UI (`chat-windows-message-textarea` plus Angular timeline classes). It can:

1. **Learn** — save the current textarea reply as a tagged writing-style example (`training`).
2. **Suggest** — call the LLM, show a suggestion card, then Insert or Insert & Send.
3. **Auto** — call the LLM, type the reply, wait 10 seconds, click send. Regenerates if the reply is shorter than 70 characters (auto) / 75 (suggest insert).
4. **Extract personals** — after scraping the timeline, ask the LLM (structured JSON) to update Customer vs Moderator/Bot profiles and pick a tone tag.
5. **Kill the multi-tab modal** — auto-click “OK and disconnect other tabs” on `<app-multiple-tabs-modal>`.

The default system prompt tells the model it is impersonating a real person on an adult/anonymous chat platform. Replies must stay unique, match the customer’s language (default Slovenian), respect a character-length rule, and not repeat introductions already in history.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Chrome Extension Manifest V3 |
| Popup / DB Viewer | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`). `src/index.css` is only `@import "tailwindcss"`. `src/App.css` is leftover Vite template CSS and is unused by `main.jsx`. |
| LLM SDK | `openai` v5 (`OpenAI` client). Grok uses the same SDK with `baseURL: "https://api.x.ai/v1"`. |
| Local DB | `idb` (IndexedDB) database `my-extension-db` / store `settings`. Used for conversations + last usage/error mirrors. Live settings and training live in `chrome.storage.local`. |
| Toasts | `react-hot-toast` |
| Unused dep | `xlsx` is in `package.json` but not imported anywhere in `src/`. |
| Unused plugin capability | `vite-plugin-static-copy` copies `src/manifest.json` → `dist/`. |

Scripts: `npm run dev` (Vite HMR for popup/db-viewer), `npm run build` (multi-entry extension bundle), `npm run lint`, `npm run preview`.

---

## 3. Directory map

```
thai/
├── index.html                 # Popup HTML → /src/main.jsx
├── db-viewer.html             # Full-tab DB viewer → /src/db-viewer-main.jsx
├── vite.config.js             # Multi-entry Rollup build
├── package.json               # name: aichat
├── eslint.config.js
├── README.md                  # stale Vite template — ignore
├── PROJECT_CONTEXT.md         # this file
├── src/
│   ├── manifest.json          # MV3 manifest (copied to dist root)
│   ├── main.jsx               # Popup React mount
│   ├── App.jsx                # Live popup UI (settings / stats / errors / history)
│   ├── background.js          # Service worker — LLM + storage + message hub
│   ├── content.js             # Page overlay, scrape, modes, modal killer
│   ├── db.js                  # Shared IndexedDB helpers (popup/viewer; SW/App inline their own)
│   ├── db-viewer.jsx          # Training / badResponses / messages inspector
│   ├── db-viewer-main.jsx
│   ├── index.css
│   ├── App.css                # leftover Vite styles
│   ├── AppLEGACY.jsx          # previous popup (not in build)
│   ├── App copy.jsx           # older popup; may contain hardcoded keys — do not use
│   └── BackhroundLEGACY.js    # previous SW (typo in filename; not in build)
└── public/                    # empty / unused in current tree
```

Build outputs (`vite.config.js`):

| Rollup input | Dist file | Role |
| --- | --- | --- |
| `index.html` | `dist/index.html` + popup JS | Extension popup (`action.default_popup`) |
| `db-viewer.html` | `dist/db-viewer.html` | Full tab opened from popup “Open DB Viewer” |
| `src/background.js` | `dist/background.js` | Service worker (`type: "module"`) |
| `src/content.js` | `dist/content.js` | Content script (`<all_urls>`, `document_idle`) |

Entry filenames stay `[name].js` so the manifest paths stay valid.

---

## 4. Architecture

```
┌─────────────────────────────┐
│ Host page (Angular chat UI) │
│  agents.moderationinterface │
│  chat.freedomgpt.com        │
└──────────────┬──────────────┘
               │ content.js injects Learn/Suggest/Auto + scrapes DOM
               │ chrome.runtime.sendMessage
               ▼
┌─────────────────────────────┐     OpenAI / xAI Responses API
│ background.js (SW)          │─────────────────────────────►
│  gptChat()                  │
│  processPersonalsWithAI()   │
└──────────────┬──────────────┘
               │ chrome.tabs.sendMessage
               ▼
┌─────────────────────────────┐
│ content.js applies reply /  │
│ updates personal textareas  │
└─────────────────────────────┘

Popup App.jsx  ──chrome.storage.local──►  SW + content
Popup App.jsx  ──IndexedDB (conversations, lastUsageStats)──
DB Viewer tab  ──chrome.storage.local──►  training, badResponses, messages
```

There is **no backend**. All LLM calls run from the service worker with keys stored in `chrome.storage.local`.

---

## 5. Target sites and DOM contract

Manifest `host_permissions`:

- `https://chat.freedomgpt.com/*`
- `https://agents.moderationinterface.com/*`

Content script matches `<all_urls>` but is written for those hosts. `__ALLOWED_HOSTS__` exists in `content.js` and is **not enforced** (the early return is commented out).

Hard-coded selectors (break if the host UI changes):

| Purpose | Selector / id |
| --- | --- |
| Reply textarea | `#chat-windows-message-textarea` |
| Card container | `.card-body` |
| Customer bubble | `li.ng-star-inserted .timeline-body` (LI without `timeline-inverted`) |
| Agent / “You” bubble | `li.timeline-inverted.ng-star-inserted .timeline-body` |
| Timeline rows | `li.ng-star-inserted` |
| Latest customer timestamp | `li.ng-star-inserted .timeline-heading` |
| Conversation start badge | `.badge.badge-primary.float-right.ng-star-inserted` |
| Loading indicator | `.loading-text` |
| Send | `button[type="submit"]` |
| Customer personals box | `#customer-custom` |
| Moderator/bot personals box | `#moderator-custom` |
| Multi-tab modal | `app-multiple-tabs-modal` |
| Disconnect-other-tabs button | outline-dark, not `btn-danger`, text contains “ok” or “disconnect” |

Injected UI ids: `mode-switcher`, `mode-learn`, `mode-suggest`, `mode-auto`, `learn-tag-select`, `ai-suggestion-card`, `manual-suggestion-wrapper`, `manual-suggestion-input`, `process-banner`.

After send / insert, the overlay is torn down when `.loading-text` appears, then `executeScript()` rebuilds it.

---

## 6. Operating modes (`content.js`)

`mode` default is **2 (Suggest)**.

| mode | UI | Behavior |
| --- | --- | --- |
| 1 Learn | green Learn button | Saves textarea text into `training` as `{ message, tag }`. Max 1000 items. Dedupes same message+tag. Also `learn2()` stores You/Customer pair in IndexedDB `conversations`. |
| 2 Suggest | black Suggest | `getSuggestion` → SW `gptChat()` → `suggestionResponse`. Card with Insert / Insert & Send. Short replies (<75) regenerate. |
| 3 Auto | black Auto | `autoFill` → `autoResponse`. Types reply, 10s countdown banner, clicks send. Short replies (<70) regenerate. |

Manual extras:

- **+ Add** — stores `You: {typed}, Customer: {latest}` into `suggestions` (max 120). Fed back as “SUGGESTED FLOW”.
- **🚩 Report Bad suggestion** — stores a triple (customer / last AI / good textarea) into `badResponses` (max 120).

Default mode buttons: Learn is visually “active” in CSS even though `mode` starts at 2; Suggest/Auto get `.active` from JS.

---

## 7. Chrome message protocol

Content → background:

| `message.type` | Payload | SW action | Reply type to tab |
| --- | --- | --- | --- |
| `getSuggestion` | — | `gptChat()` | `suggestionResponse` `{ success, message, error }` |
| `autoFill` | — | `gptChat()` | `autoResponse` same shape |
| `storeConversations` | `{ You, Customer, date }` | append IndexedDB `conversations` | none |
| `processPersonals` | `{ data: { customerPersonal, moderatorPersonal }, conversationHistory }` | `processPersonalsWithAI()` | `personalsResponse` `{ success, customerPersonal, moderatorPersonal, tag, error }` |

`processPersonals` is the only handler that `return true`s for async `sendResponse`. Suggest/auto fire-and-forget via `tabs.sendMessage`.

---

## 8. Storage

### 8.1 `chrome.storage.local` (source of truth for live automation)

**Popup settings (written by `App.jsx` Save):**

| Key | Meaning | Defaults / notes |
| --- | --- | --- |
| `system` | System prompt text | Slovenian adult-chat impersonation prompt |
| `openai` | OpenAI API key | required for OpenAI models **and** for personals extraction (always OpenAI) |
| `grokKey` | xAI API key | required when model name contains `grok` |
| `openaiModel` | Model id | default in UI `gpt-5.4`; SW fallback `gpt-5.1` |
| `model` | hardcoded `"openai"` on save | leftover; SW uses `openaiModel` |
| `learnExamplesLimit` | how many style examples for normal tags | allowed `{5,10,20,30,50}`, default 30 |
| `triggerLearnExamplesLimit` | examples for `(trigger)*` tags | allowed `{2,5,10}`, default 2 |
| `msgLenMode` | `fixed` \| `range` \| `random` | when variation UI is on, stored as `range` |
| `msgLenFixed` | exact char count | 120 |
| `msgLenFrom` / `msgLenTo` | range / random bounds | 80–150 |
| `msgVarEnabled` | short/long variation | true when UI mode is `variation` |
| `msgVarStrategy` | `pattern` \| `random2` | pattern default |
| `msgVarPattern` | e.g. `2S1L` | S=short, L=long; optional counts; max 5000 steps |
| `msgShortFrom` / `msgShortTo` | short band | 60–100 |
| `msgLongFrom` / `msgLongTo` | long band | 120–180 |
| `msgVarIndex` | pattern cursor | incremented each `gptChat()` in pattern mode |

**Scraped / runtime (written by `content.js` + SW):**

| Key | Meaning |
| --- | --- |
| `messages` | timeline lines `You: …` / `Customer: …` (latest scraped set) |
| `currentMessage` | `[{ role: "user", content: latestCustomer }]` — LLM user turn |
| `customerPersonal` / `moderatorPersonal` | labeled text blocks |
| `personals` | combined string `You: {mod}, customer{cust}` (no space after `customer`) |
| `conversationStart` | start-badge text |
| `latestMessageDate` | latest customer heading timestamp |
| `botNow` | `new Date().toString()` at scrape time |
| `selectedTag` | one of `TAGS` |
| `training` | `[{ message, tag }]` (legacy strings still accepted) |
| `suggestions` | suggested-flow pairs; cleared after send |
| `suggestion` | draft text in the manual input |
| `badResponses` | reported bad/good pairs |
| `lastAISuggestion` | last N AI replies (bounded 120); used as “avoid repeating” |
| `lastDesiredExactChars` | last computed X or `"A-B"` range string |
| `lastUsageStats` | `{ model, promptTokens, cachedTokens, completionTokens, totalTokens, cost, timestamp }` |
| `lastError` | `{ title, details, timestamp }` |

### 8.2 IndexedDB `my-extension-db` / `settings`

Key-value store `{ key, value }`. Helpers in `src/db.js`; **App.jsx and background.js re-inline the same helpers** instead of importing `db.js` (SW cannot reliably share that module path unless bundled — background is its own Rollup entry).

Used keys:

- `conversations` — `{ You, Customer, date }[]`
- `lastUsageStats` / `lastError` — mirrored from chrome.storage

Popup History tab reads `conversations` from IDB, not chrome.storage.

---

## 9. AI pipelines (`background.js`)

### 9.1 `processPersonalsWithAI`

Always uses **OpenAI** (`openai` key + `openaiModel`), Chat Completions + `response_format.json_schema` (`personals_and_tag`).

Output schema:

```json
{
  "customer": { "name", "age", "city", "job", "sexPreference", "others" },
  "moderator": { same },
  "tag": "<one of TAGS>"
}
```

Merge rules (code, not just the prompt):

- Parse existing textboxes (English + Slovenian labels: ime, starost, mesto, poklic, spolne preference, ostalo).
- Never overwrite a field with empty incoming.
- `others` is comma-merged with accent-insensitive dedupe.
- Render back to exact labels: `Name:`, `Age:`, `City:`, `Job:`, `Sex preference:`, `Others:`.
- If formatted block missing those labels, do not update UI.

Prompt constraints agents must not “simplify away”:

- Values in **Slovenian**, keys English.
- Extract only explicit facts; no guessing.
- Customer vs moderator must not be mixed.
- `sexPreference` is sexual acts + clothing likes, assigned to the speaker.
- `others` is a short high-signal list (relationship duration, living situation, kids/family, pets, hobbies, schedule, appearance, last sex timing, smoking, affairs, serious family illness, long stays abroad).
- Tag must be a trigger tag if the latest message is one of: `(Leere Nachricht)`, `[Please reactivate the user!]`, `[kiss]`, `[heart]`, `[Klaps]` / slap variants.

### 9.2 `gptChat` (Suggest / Auto)

Model routing:

- If `openaiModel` contains `grok` (case-insensitive) → xAI Responses API (`https://api.x.ai/v1`), key `grokKey`. System prompt is the first `input` message. Extra instruction: do not mention character count like `(XX CHARACTERS)`. `store: false`.
- Else → OpenAI Responses API, key `openai`, system prompt in `instructions`, `max_output_tokens: 8000`, `store: false`.

Temperature `0.7` is **omitted** if the model name includes any of: `reasoning`, `nano`, `o1`, `o3`, `o4`, `gpt-5`, `gpt-4.1`.

Reply text: `output[0].content[0].text` or fallback `output_text`.

The assembled system prompt is a concatenation of:

1. User-editable `system` (or hardcoded Slovenian default)
2. Character-length lock (`exactly N` or `between A and B`)
3. Conversation-start / first-message / real-name vs nickname rules
4. Personal info block (bot = you, customer = them)
5. **Gender / grammar block (Slovenian)** — customer always grammatically masculine; gay player masculine; trans woman player feminine grammar + male anatomy. Never reveal the rule.
6. Conversation history (latest → oldest)
7. Random tagged writing-style examples
8. Suggested flow
9. Bad responses to avoid
10. Previous AI replies to avoid
11. Time-context block (`latestMessageDate` + `botNow` only; greetings, work-hour check-ins; never quote timestamps)
12. Trigger-message response hint

Personals extraction still uses Chat Completions; reply generation uses **Responses API**. Do not “unify” these without checking each provider’s parameter differences (Grok rejects `instructions`).

### 9.3 Pricing / stats

`PRICING_MAP` is USD per 1M tokens. Supports cached input for Grok. Stats shown on popup Stats tab. Errors shown on Errors tab (`lastError`).

---

## 10. Message length system

UI dropdown (`uiLenMode`) vs stored fields:

| UI | `msgVarEnabled` | `msgLenMode` | What SW sends to the model |
| --- | --- | --- | --- |
| Fixed | false | `fixed` | `exactly {msgLenFixed} characters` |
| Range | false | `range` | `between A and B` (does **not** pick a single number) |
| Random | false | `random` | picks one integer in [from, to] each call |
| Variation | true | stored as `range` | pick S or L, then random in that band |

Pattern `2S1L` → sequence `[S,S,L]` cycling via `msgVarIndex`. Bare `S` / `L` counts as 1. Invalid characters blocked in popup (`validatePattern`). Fallback parse in SW if empty: `["S","S","L"]`.

Content script additionally rejects short replies and retries (independent of the length prompt).

---

## 11. Tags (must stay exact)

Shared across `background.js`, `content.js`, `db-viewer.jsx`:

```
flirty
soft
question
Erotic
flirty and soft
flirty and question
flirty and erotic
soft and question
Soft and erotic
Question and erotic
(trigger) Leere Nachricht
(trigger) [kiss]
(trigger) [heart]
(trigger) [Klaps]
(trigger) Please reactivate the user!
```

Default tag: `flirty`. Unknown tags clamp to default. Trigger tags use `triggerLearnExamplesLimit` and must start with `(trigger)`.

Training examples are sampled with partial Fisher–Yates (`pickRandomN`). If no examples match the selected tag, all training texts are used as fallback.

---

## 12. Popup UI (`App.jsx`)

Width `780px`. Tabs: Settings / Stats / Errors. History toggle reads IDB conversations.

Settings layout:

- Left: system prompt textarea (auto-grow) + Open DB Viewer (`chrome.tabs.create` → `db-viewer.html`)
- Right: OpenAI + Grok keys, model select (Grok 4.20 / GPT-5.x / GPT-4.1), message length, learn-example counts

Learn-example dropdowns persist immediately; everything else persists on **Save**. Save is blocked if variation+pattern is invalid.

Scroll-jump prevention: `preserveScroll` + `useLayoutEffect` because the popup remounts/reflows on every keystroke otherwise.

Exported memo components: `Card`, `Label`, `TabBtn`, `Input`, `Select`, `NumericInput`.

---

## 13. DB Viewer (`db-viewer.jsx`)

Full-tab page. Categories: `training`, `badResponses`, `messages`. `suggestions` exist in storage but are hidden.

Training-only JSON import/export:

```json
[{ "message": "…", "tag": "flirty" }]
```

Import modes: append | replace. Legacy strings and `{ message, tags }` are normalized. Add-row UI with tag select. Per-row delete.

---

## 14. How to run / load as an extension

1. `npm install`
2. `npm run build` → `dist/`
3. Chrome → Extensions → Load unpacked → select `dist/`
4. `npm run dev` is useful for iterating on popup/db-viewer in the browser, but the **content script + SW only update after a rebuild + extension reload**.

Popup title in `index.html` is still “Vite + React”. Manifest permissions: `storage`, `scripting`, `tabs`, `activeTab`, `webRequest`.

---

## 15. Leftover / do-not-use files

| File | Status |
| --- | --- |
| `README.md` | Vite boilerplate |
| `src/App.css` | unused template CSS |
| `src/AppLEGACY.jsx` | old popup |
| `src/App copy.jsx` | older popup; **contains hardcoded API keys** — never copy them into new code or commits; treat as leaked if they were real |
| `src/BackhroundLEGACY.js` | old service worker |
| `xlsx` dependency | unused |

Active sources of truth: `App.jsx`, `background.js`, `content.js`, `db-viewer.jsx`, `manifest.json`, `vite.config.js`.

---

## 16. Pitfalls for agents working in this repo

1. **Two storage systems.** Settings/training = `chrome.storage.local`. Conversation history in the popup = IndexedDB. Do not assume one store has everything.
2. **IDB helpers are duplicated** in `App.jsx` and `background.js`. Changing `db.js` alone will not change the SW or popup unless you also change the inlines (or actually import and bundle).
3. **Personals always need an OpenAI key**, even when the reply model is Grok.
4. **Grok vs OpenAI request shapes differ.** Do not pass `instructions` to Grok; do not assume Chat Completions for `gptChat`.
5. **Range mode is a string `"A-B"`**, not a sampled integer. Only fixed / random / variation produce a single `X`.
6. **Tag strings are case-sensitive and mixed-case** (`Erotic` vs `flirty`, `Soft and erotic`). Do not normalize case.
7. **`personals` concatenation has no space:** ``You: ${mod}, customer${cust}``.
8. **Content script host allowlist is commented out** — it can run on any page matching `<all_urls>`, but DOM logic only works on the Angular chat UI.
9. **Short-reply retry loops** can re-call the API without user action.
10. **Multi-tab modal auto-click** uses MutationObserver + 1s interval + visibilitychange.
11. **Folder name `thai` ≠ language.** Product language is Slovenian.
12. Do not commit keys. Popup fields are empty by design; leftover files may still have secrets.

---

## 17. Typical change map

| If you need to change… | Edit |
| --- | --- |
| Popup settings / models / length UI | `src/App.jsx` |
| Prompt assembly, pricing, Grok/OpenAI call | `src/background.js` |
| Host DOM, modes, insert/send, scrape | `src/content.js` |
| Training import/export | `src/db-viewer.jsx` |
| Permissions / hosts / SW path | `src/manifest.json` |
| Build entries | `vite.config.js` |
)
