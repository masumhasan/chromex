# Implementation Plan — Project 1 (no code yet)

Goal: **same extension, cheaper generations, same or better human feel.**  
Constraint: do not rebuild tags, do not build a new site, do not publish to the store, do not remove Auto / Learn / Suggest / Jan’s prompt box.

This is the approach. Implementation starts only after Phase 0 inputs exist.

---

## Guiding rules

1. **Human-likeness is the product. Tokens are the constraint.** If a cut makes replies colder, shorter, or more repetitive, revert it.
2. **Measure before changing.** We do not guess which prompt block is expensive. We weigh each block on a long thread.
3. **Jan keeps control.** System prompt, tags, Learn limits, length modes stay editable. We change *packing*, not his workflow.
4. **Long customers are the test, not empty chats.** A 2021 thread is the real bill and the real quality risk.
5. **Two API calls exist today.** Every incoming message can fire `processPersonals` (Chat Completions + JSON schema) **and** `gptChat` (Responses API). Cost work must include both.
6. **No model downgrade as the first move.** Mini / Grok are later experiments. His Grok bill was likely the same huge prompt on a pricey model.
7. **Do not “fix” the 10s send delay** unless he asks. It is realism, not lag.
8. **Step by step.** Ship cost wins that leave UX familiar. Architecture rewrite is project 2.

---

## Why the bill is high (current assembly)

`gptChat()` concatenates almost everything into one `instructions` / system string:

| Block | Source | Waste pattern |
| --- | --- | --- |
| Jan’s system prompt | `chrome.storage.system` | Needed. Do not strip without his new prompt file. |
| Length lock | settings | Small. Keep. |
| First-message / nickname rules | hardcoded | Always sent, even on year-5 threads. |
| Personals | customer + moderator boxes | Needed. Duplication with history is the issue. |
| Gender / grammar block | large hardcoded Slovenian rules | Static, sent every time. Candidate to compress, not delete. |
| **Full scraped history** | `messages` | **Main suspect.** `grabData` scrolls and dumps the timeline. A 5-year chat can dominate the request. |
| Style examples | random N from selected tag | He already set N≈5. Keep the control; improve *which* 5. |
| Suggested flow | `suggestions` | Fed by **+ Add**, which he does not use — but still injected if anything is stored. |
| Bad responses | `badResponses` (up to 120) | Fed by **Report**. He does not use it; leftover data still ships. |
| Previous AI replies | `lastAISuggestion` (up to 120) | Every Suggest/Auto can grow this. Can become a second history. |
| Time-context block | `latestMessageDate` + `botNow` | Useful. Long. Compress later. |
| Trigger hint | hardcoded | Small. Keep. |
| Latest user turn | `currentMessage` | Needed. |

Plus **personals extraction** on every scrape: structured JSON for customer + moderator + tag. That is a second paid call, often on a GPT-5-class model.

Content script also **regenerates** if a reply is under ~70–75 characters. Failed length = paid twice.

---

## Phase 0 — Inputs and baseline (do this before any code)

Nothing in later phases is safe without this.

### 0.1 Get from Jan (Fiverr, plain language)

- Login for `agents.moderationinterface.com` (and FreedomGPT if he uses it).
- His **current live system prompt** (he said he will send it separately).
- A packed extension zip if it differs from this repo.
- Permission to generate on **one long thread** and **one trigger** for measurement (he pays those tokens).
- Confirm: keep the 10s Auto delay as-is for v1.

Do **not** ask him for Mongo / `.env` / AWS.

### 0.2 Instrument without changing behavior

Add a **debug-only token ledger** (log or stats field), not a UX rewrite:

For one Suggest/Auto and one personals call, record character/token estimates per section:

- system prompt
- gender block
- date block
- personals
- history (line count + chars)
- examples
- lastAISuggestion
- badResponses
- suggestions
- personals-call prompt separately

Use this to rank cuts. Expected order of savings: **history → lastAISuggestion/badResponses → personals call frequency → static rule blocks → examples**.

### 0.3 Freeze a quality baseline

On the same long thread, save 3–5 replies **before** changes (text, tag, length setting, cost, input tokens). Those become the A/B set. Jan reviews later: “cheaper, and still me?”

### 0.4 Phase 0 exit

- Live prompt in hand
- Site access working
- One spreadsheet/log: % of input per block
- Agreement: delay stays; tags stay; Auto stays

---

## Phase 1 — Stop shipping unused payload (low risk, fast)

**Approach:** send less of what he already abandoned. Do not change buttons’ visibility until he confirms.

1. **Cap and default-off the foot-guns**
   - `lastAISuggestion`: do not send up to 120 full replies. Keep a small recent set (e.g. last 3–5) or skip if Suggest was not just retried.
   - `badResponses` / `suggestions`: omit from the prompt when empty; if present, cap hard (e.g. 3).
   - **+ Add** and **Report**: either hide, or keep UI but **stop appending unbounded arrays into every future call**. That is the “logic is not good” he described.

2. **Omit empty sections**
   - If there are no examples, no bad list, no suggestions — do not send the `--- BAD RESPONSES ---` wrappers. Empty headers still cost tokens and distract the model.

3. **Do not change Learn / tag pick / Auto send path.**

**Exit:** same replies, stats show a drop on threads that had bloated `lastAISuggestion`. No workflow change Jan can see, except maybe quieter unused buttons.

---

## Phase 2 — History packing (highest savings, highest risk)

This is the core of project 1. **Do not truncate to “last 10 lines” and call it done.**

### Approach: three-layer memory, not a full dump

| Layer | What goes in | Why |
| --- | --- | --- |
| **Personals (source of truth)** | Structured player + customer fields | Years of facts should live here, not in a 5-year transcript |
| **Recent window** | Last N exchanges (raw), plus the latest customer line | Style, current topic, last question |
| **Pinned recap** | Short rolling summary of older chat (topics already done, intro done, name asked, conflicts with other agents) | Cheap substitute for 2021–2025 scrollback |

### How to introduce it safely

1. **First implementation: window + personals only**, with a **visible cap** (e.g. last 30–50 lines, configurable later). Keep a debug flag to send “full history” for A/B.
2. Compare quality on the baseline thread. If the model repeats an old intro or forgets a known fact that is **already in personals**, that is an extraction/merge bug — fix personals, do not put the whole history back.
3. If it forgets facts **not** in personals, then add a **compact recap** (one extra cheap call *occasionally*, or a locally maintained bullet list). Recap must be cheaper than sending the full thread every time.
4. `grabData` should still scroll enough to get the latest messages and timestamps. We change **what we send to the API**, not whether the overlay can see the chat.

### Multi-agent caveat (flag, don’t over-build)

Other agents can write in the same thread. The recap/window should mark “You” vs customer vs unknown-agent lines if the DOM allows. Do not imitate a stranger agent. v1: preserve the `You:` / `Customer:` labels; do not invent a full multi-agent product.

**Exit:** input tokens on the long thread drop **materially** (target: history no longer the majority of the request). Jan says the reply still knows the customer. If not, widen the window or restore recap — do not silently ship.

---

## Phase 3 — Two-call tax (personals + reply)

Today every scrape can pay for extraction **and** a reply.

**Approach:**

1. **Keep extraction.** He needs the logbook updated. Do not remove it.
2. **Skip or cheapen when nothing changed**
   - If the latest message is a trigger emoji / empty picture / reactivate, tag is deterministic — skip a full personals JSON call or use a tiny classifier.
   - If the latest line has no new fact-shaped content, reuse last personals + last tag.
3. **Use a cheaper model for extraction only** (possible later). Reply model stays what he chose. Extraction is structured JSON; it does not need GPT-5.4. *Propose this to him; do not swap silently.*
4. Deduplicate: personals prompt and reply prompt both restate Slovenian/field rules. Extraction prompt stays detailed; reply prompt should **trust the already-merged boxes**, not re-extract.

**Exit:** fewer personals calls per hour of Auto; reply quality unchanged; logbook still updates when a real fact appears.

---

## Phase 4 — Static prompt compression (after his live prompt arrives)

Order matters: **wait for Jan’s prompt file.** Then:

1. Keep his text as the editable `system` field. Do not overwrite his voice.
2. Compress **our** hardcoded blocks (gender, time, first-message, trigger) so they do not repeat the same rules three times.
3. On year-5 threads, drop or shorten “if this is the first message, ask get-to-know questions.” The start date is enough.
4. Length instruction stays one line. Grok extra “don’t say (XX characters)” stays.

**Exit:** smaller static prefix; his prompt still in the popup unchanged unless he sends a rewrite.

---

## Phase 5 — Length reliability (cuts hidden double-pay)

He said length modes are “okay, not very very good.” Short replies trigger **paid regenerate**.

**Approach (after cost packing is stable):**

- Keep Fixed / Range / Random / Variation. Do not remove Variation.
- Make the length instruction match the mode (range stays a range; variation stays short/long).
- Soften the content-script “<70/75 regenerate” so a naturally short trigger reply (kiss / heart / reactivate) is not forced to 75+ characters and billed again.
- Do **not** make the model print character counts (already a Grok issue).

**Exit:** fewer automatic second calls; Jan feels length settings “listen” more often.

---

## Phase 6 — Examples and tags (tighten, do not replace)

He already limits examples to save money. We do not replace the tag system.

**Approach:**

- Keep his N dropdown (5 / 10 / …).
- Prefer examples for the **selected tag**; keep fallback to all texts only if that tag is empty.
- Optional later: prefer **recent** Learn items over a uniform random 5 (his current voice beats 2-year-old examples).
- Triggers keep the smaller N.

**Exit:** same UI; slightly more relevant examples; no architecture speech to Jan.

---

## Phase 7 — Timing and Auto (preserve, then optional polish)

v1: **leave the 10s countdown.**

If we touch it at all (only with his OK): make delay **configurable** (e.g. 8–15s) or scale lightly with character count. Default stays at his current feel.

Auto loop, Learn-sends-message, insert / insert-and-send, multi-tab modal click — **regression-test only**. These are not cost features; they are the product.

---

## Phase 8 — Live QA with Jan (the real acceptance)

Not a unit-test phase. A Fiverr + screen-share checklist:

1. Long customer: cheaper stats, still personal, Slovenian, no repeated intro.
2. New/short chat: still greets / gets-to-know when appropriate.
3. Trigger: picture, kiss, heart, reactivate — correct tag family, natural poke.
4. Suggest → edit → insert; Suggest → insert & send.
5. Auto for a stretch (not 5 hours on our clock, but several incoming messages).
6. Learn still saves under the chosen tag and still sends.
7. Prompt box still saves and still affects the next reply.
8. Stats still match what he uses to police spend.
9. He is not logged out more often than today; overlay still appears after send.

If he says “cheaper but not me,” roll back Phase 2 window size before anything else.

---

## Suggested delivery order

```
Phase 0  Baseline + credentials + his prompt
    ↓
Phase 1  Stop unused payload (safe, visible $ drop)
    ↓
Phase 2  History window + personals as memory (big $ drop)
    ↓
Phase 3  Skip/cheap personals call when possible
    ↓
Phase 4  Compress our static blocks (his prompt untouched)
    ↓
Phase 5  Length / regenerate loops
    ↓
Phase 6  Example sampling polish
    ↓
Phase 7  Delay left alone unless he asks
    ↓
Phase 8  Jan live QA → ship unpacked dist
```

Do not start Phase 4 until Phase 0.1 prompt is in.  
Do not start Phase 2 without a before/after on a long thread.  
Do not announce a new architecture to him during this sequence.

---

## What we explicitly will not do in this plan

- New website or hosting
- Chrome Web Store
- Replacing tags with embeddings / RAG as the first delivery
- Silent switch to mini / Hugging Face
- Removing Auto, Learn, Suggest, or the prompt editor
- Making replies instant
- Asking him for a database URL

Those stay on a **later** conversation, after he sees cheaper + same-quality Auto on his real customers.

---

## Team operating approach

| Topic | How we work |
| --- | --- |
| Client comms | Fiverr. Short asks. “Login + prompt + zip.” |
| Source of truth | His live prompt + this repo. Leftover files (`App copy.jsx`, etc.) are not production. |
| Secrets | Keys stay in the popup / his machine. Do not commit them. |
| Builds | `npm run build` → load `dist`. Content script / SW need rebuild + extension reload. |
| Reviews | Every packing change: token ledger + 1 long-thread reply side-by-side. |
| Rollback | Feature flags or storage keys (`useFullHistory`, etc.) so we can restore old packing in minutes. |

---

## Success bar (repeat)

We are done with project 1 when Jan can open a **years-old** chat, hit Suggest or Auto, see a **lower input-token / $ number** than $0.006–$0.012 for that class of context, and still believe the player is the same person — and when he can leave Auto on without us having removed his prompt, tags, or human delay.

---

## Next action (still no code)

1. Message Jan for site login, current prompt, and extension zip.
2. Run one instrumented generation on a long thread (read-only logging if we add it later).
3. Rank blocks from that ledger, then start Phase 1.
)
