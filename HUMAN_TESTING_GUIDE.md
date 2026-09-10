# Human testing guide — load the extension and run live QA

Yes. You must load **`dist/`** as an unpacked Chrome extension. Chrome does not run `src/` or `npm run dev` as the live overlay. `npm run dev` is only useful for poking at the popup in a normal browser tab. Suggest, Auto, and the chat-page buttons come from the **built** `content.js` + `background.js` inside `dist/`.

Repo folder: `c:\20300\github\thai`  
Load this folder in Chrome: `c:\20300\github\thai\dist`

---

## 0. What you need before you start

- Chrome (or Edge, same steps under `edge://extensions`)
- A completed build (already done if `dist/manifest.json` exists)
- For **popup-only** checks: nothing else
- For **real Suggest/Auto**:
  - OpenAI API key in the extension popup (Grok key only if you pick a Grok model)
  - Login for `agents.moderationinterface.com` (and FreedomGPT if you use that host)
- A **long** customer thread if you want a fair cost comparison (empty chats will look cheap and lie)

Keep this project private. Do not publish to the Chrome Web Store.

---

## 1. Build (if `dist` is missing or stale)

In the project folder:

```
npm run build
```

Confirm these files exist under `dist/`:

- `manifest.json`
- `background.js`
- `content.js`
- `index.html`
- `db-viewer.html`

After **every** new `npm run build`, you must reload the extension (step 3) **and** refresh the chat tab.

---

## 2. Load unpacked `dist/` in Chrome (first time)

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the **`dist`** folder only — not the repo root, not `src`
5. You should see **Ai Chat Automation (Grok Update)** version 5.0
6. Click the puzzle-piece icon in the toolbar → pin this extension so the popup is easy to open

If Chrome errors on load, you picked the wrong folder. Pick `dist` again.

### Already had an older copy of this extension?

Remove or disable the old one first, or click **Reload** on the existing card after pointing it at this `dist`. Two copies on the same chat page will fight each other.

---

## 3. Reload after you rebuild

1. `chrome://extensions`
2. On this extension, click **Reload**
3. Go to the chat tab and **hard-refresh** the page (`Ctrl+F5`)
4. Open the popup once so it picks up new Stats/Settings UI

If Learn/Suggest/Auto look like the old UI, the tab is still running the previous content script. Refresh the chat page.

---

## 4. Put keys in the popup (needed for generation)

1. Click the extension icon
2. **Settings**
3. Paste **OpenAI API key** (required for personals extraction and for GPT models)
4. Paste **Grok API key** only if the model dropdown is a Grok model
5. Click **Save**

You can check Settings/Stats without keys. Suggest/Auto will fail until a key is saved.

---

## 5. Open the live chat site

1. Log in to `https://agents.moderationinterface.com` (or FreedomGPT if that is the session you are testing)
2. Open a conversation until the message box `#chat-windows-message-textarea` is on screen
3. Wait until the overlay appears: **Learn**, tag dropdown, **Suggest**, **Auto**, plus Insert / Insert & Send when a suggestion exists

If the overlay never appears:

- Confirm the extension is loaded from `dist` and enabled
- Refresh the chat tab
- Confirm you are on the real chat page, not a login interstitial
- Check `chrome://extensions` → Errors on this extension

---

## 6. Popup checks (no chat required)

Open the extension popup:

1. **Settings**
   - [ ] System prompt box is there and Save works
   - [ ] **History lines sent to AI** exists (All, 20, 40, 60, 80). Leave **40** unless you are debugging quality
2. **Stats**
   - [ ] Cost / model / token cards
   - [ ] **Prompt ledger** (may say “No ledger yet” until the first Suggest/Auto)
   - [ ] **Save as Before** / **Save as After** / Clear After / Reset Before
3. **Errors** tab — leave open if a generation fails

---

## 7. Chat overlay checks (on a real thread)

1. **Learn**, **Suggest**, **Auto** are visible
2. Tag dropdown still has normal + trigger tags
3. **+ Add** and **Report** are still there (you do not have to use them)
4. Click **Suggest** once
   - A suggestion card should appear
   - **Insert** and **Insert & Send** still work
5. Click **Auto** on a message you can cancel if needed
   - [ ] **10 second** countdown still runs before send
   - Do not expect instant send; that delay is intentional

---

## 8. Cost / packing checks (after one successful Suggest or Auto)

Open the popup → **Stats**.

1. Ledger **History lines** should be about **40** (or whatever you selected), not hundreds on a years-old thread
2. Empty sections (bad responses, suggested flow, previous AI) should show **0** if those lists are empty
3. Note **Input tokens** and **Cost $**

### Before / After snapshots

Packing is already in this `dist`. You probably **cannot** capture a true “old extension” Before unless you still have the previous unpacked build.

Practical approach:

- Treat Jan’s old band **~$0.006–$0.012** per message as the historical Before
- On a **long** thread, run Suggest or Auto on **this** `dist`
- Click **Save as After (updated)**
- If you still have an old build: load that `dist` first, generate, **Save as Before**, then switch back to this `dist`, generate, **Save as After**

Compare on the same kind of chat (long customer, not a new empty thread).

---

## 9. Trigger and short-reply checks

On a thread where the latest customer line is a trigger (`[kiss]`, `[heart]`, `[Klaps]`, `(Leere Nachricht)`, `[Please reactivate the user!]`):

- [ ] Overlay still suggests/sends
- [ ] A short reply should **not** immediately “too short / regenerating”
- [ ] Personals boxes should not look like they were rebuilt from a big AI rewrite (trigger path skips that call)

On a **normal** long flirty/question message, a tiny model reply under ~70–75 characters may still regenerate. That is expected.

---

## 10. Quality gate (what Jan will feel)

On a years-old customer:

- [ ] Slovenian, in character, does not restart “get to know you”
- [ ] Uses player vs customer personals
- [ ] Auto can handle several incoming messages without looking robotic (keep the 10s wait)
- [ ] If it gets dumber or repeats intros: set **History lines → All (0)**, Save, reload extension, refresh the chat tab, retry **before** changing anything else

---

## Quick order (copy this)

1. `npm run build`
2. `chrome://extensions` → Developer mode → **Load unpacked** → `dist`
3. Pin the extension → paste API keys → **Save**
4. Log into the chat site → refresh the tab → confirm Learn / Suggest / Auto
5. Long thread → Suggest or Auto → open Stats (ledger + cost)
6. **Save as After** (or Before if you still have the old build)
7. Try one trigger message
8. If quality is bad → History lines = All → retest

Errors: popup **Errors** tab, and `chrome://extensions` → this extension → **Errors**.
