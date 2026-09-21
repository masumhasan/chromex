# Antigravity Workspace Rules & Project Memory

> **Ai Chat Automation (Grok Update)** — Chrome Extension MV3
> Repository: `masumhasan/chromex` (local folder `thai`)
> Current Version: 5.0

---

## 1. Project Overview & Client Context

- **Client:** Jan
- **Core Purpose:** Private Chrome MV3 extension used by chat operators on third-party chat moderation platforms:
  - `https://agents.moderationinterface.com/*`
  - `https://chat.freedomgpt.com/*`
- **Product Language:** **Slovenian** (workspace folder name `thai` is just a local folder name, NOT the language).
- **Core Modes:**
  1. **Learn:** Saves operator's textarea reply into `training` tagged examples (`chrome.storage.local`).
  2. **Suggest:** Scrapes timeline, calls LLM via background SW, presents suggestion card with "Insert Text" and "Insert & Send".
  3. **Auto:** Calls LLM, auto-types into composer, displays a 10s countdown banner, and auto-submits.
- **Client Constraints & Preferences:**
  - **Auto 10s delay:** MUST NOT be shortened or removed. It provides realism so operators don't look robotic.
  - **Persona:** Impersonates a real human Slovenian persona on an adult/anonymous platform. Replies must be warm, unique, colloquial, and never robotic.
  - **Optimization Goal:** Token and cost reduction on long threads (years-old chats were costing ~$0.006–$0.012 / 2k–9.6k tokens per message). Output is already small; prompt packing & smart caching are the key levers.
  - **Tag System:** Keep existing 14 tags intact; tag refactoring is out of scope for this phase.

---

## 2. Technical Stack & Build Setup

| Component | Technology |
| --- | --- |
| Runtime | Chrome Extension Manifest V3 |
| Popup / DB Viewer | React 19 + Vite 7 + Tailwind CSS 4 (`@tailwindcss/vite`) |
| LLM SDK | `openai` v5 client (used for OpenAI and xAI Grok with `baseURL: "https://api.x.ai/v1"`) |
| Storage 1 | `chrome.storage.local` (live settings, prompt config, training data, bounded arrays) |
| Storage 2 | IndexedDB `my-extension-db` / store `settings` (`conversations` history, mirrored stats, benchmarks) |
| Multi-entry Build | `vite.config.js` (`index.html` -> popup, `db-viewer.html` -> dbviewer, `background.js`, `content.js`) |
| Content Script Post-process | `flattenContentScript()` plugin in `vite.config.js` bundles `dist/content.js` to an IIFE via esbuild (Chrome blocks ES `import` chunks in content scripts) |

### Verification & Build Commands
- Smoke test: `node scripts/check-packing.mjs`
- Lint: `npm run lint`
- Build: `npm run build`

---

## 3. Storage Architecture & Pitfalls

1. **Dual Storage Architecture:**
   - `chrome.storage.local` is the primary source of truth for runtime automation, LLM API keys, system prompts, training examples, and prompt settings.
   - IndexedDB (`my-extension-db`) stores `conversations` history (rendered in Popup History tab) and mirrors `lastUsageStats`, `lastError`, and `benchmarkBefore` / `benchmarkAfter`.
2. **Duplicated IDB Helpers:**
   - `src/App.jsx` and `src/background.js` duplicate the IDB key-value helpers rather than importing `src/db.js` due to separate bundling. If IDB logic changes, update both!
3. **Personals Extraction API:**
   - Always uses OpenAI (`openai` key + `openaiModel`, Chat Completions JSON schema), even when Grok is selected for chat generation.
4. **Grok vs OpenAI Responses API:**
   - Chat generation uses the **Responses API**. Grok rejects the `instructions` parameter; system prompt is passed as the first `input` message. OpenAI accepts `instructions`. Do not mix these up.
5. **Content Script Isolation:**
   - `dist/content.js` MUST remain a single self-contained IIFE without dynamic ES module imports (`import ... from "./chunks/..."`).

---

## 4. Prompt Packing & Optimization Rules (Tasks 01–15)

The following optimizations are active in `src/promptPacking.js`, `src/background.js`, and `src/content.js`:
- **Token Ledger & Benchmarks:** `lastPromptLedger` tracks approximate tokens/characters per prompt section; Popup Stats provides "Save as Before" and "Save as After" benchmark comparison.
- **Empty Section Omission:** Empty lists (examples, bad responses, suggestions, prev AI) are completely omitted from prompt without leaving empty section headers.
- **Capped Lists:**
  - Prompt sends at most 5 previous AI replies, 3 bad responses, 3 suggested flows.
  - Runtime arrays in `content.js` cap growth at 10 items.
- **History Windowing:** Default is 40 lines (`historyMaxLines`). Settable in Popup Settings (All [0], 20, 40, 60, 80).
- **Trigger Optimization:**
  - Personals extraction is skipped on trigger messages (`[kiss]`, `[heart]`, `[Klaps]`, `(Leere Nachricht)`, `[Please reactivate the user!]`) and plain chit-chat without facts (`ok`, `haha`).
  - Short trigger replies are NOT regenerated (avoids duplicate API calls).
- **Recent Learn Examples:** Normal tags sample from the last `N * 3` Learn items to preserve operator's most recent style.
- **First Message Prompt:** Established chats (> 8 history lines) receive a concise first-message prompt.

---

## 5. Testing & Operator Workflow

1. Always build via `npm run build`.
2. Unpacked extension directory is `c:\20300\github\thai\dist`.
3. In Chrome (`chrome://extensions`), reload the extension and hard-refresh (`Ctrl+F5`) the chat tab (`agents.moderationinterface.com`).
4. To test with Antigravity browser automation, use the instructions in `ANTIGRAVITY_QA.md` and respect the safety gates (`ALLOW_AUTO_SEND`, `ALLOW_INSERT_AND_SEND`).
