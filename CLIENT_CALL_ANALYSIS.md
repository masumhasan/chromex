# Client Call Analysis — Jan (Zoom kickoff)

Source: `transcription.md` (kickoff call between Nur Hasan Masum, a backend developer, and client **Jan**).

This note separates **what was sold / framed as the first project**, **what Jan said out loud**, and **what he actually wants**. The transcript is noisy (tags spoken as “tux/tax”, Klaps as “collapse”, Leere Nachricht as “Lair and Ikricht”). Meanings below are resolved against that context and the existing extension.

---

## 1. Who Jan is and what the product is for

Jan is not asking us to build a public chatbot product. He is an **operator on a third-party chat platform** (`agents.moderationinterface.com` / related chat UI). Many people worldwide use that site. It is **not his website**. He logs in as an agent.

On that platform:

- A **customer** pays to talk with someone they believe is a real person.
- Jan (and his extension) play the **player** — the persona on the other side. He said he personally plays that role in ~99% of messages.
- The Chrome extension sits on top of the site and **replaces him sitting at the computer waiting for messages**.
- Conversations can last years. He showed a customer whose thread started **8 November 2021** and was still active (last message ~25 August 2026). That customer is valuable.
- If he is not logged in, **other unknown agents on the same platform** can also reply to the same customer. He does not know those agents or their style.
- The host site logs him out if he does not respond for about **8 minutes**. During the call he was kicked for not sending.

Business model in one line: **paid 1:1 relationship chat, Slovenian, adult/flirty register, human-looking replies, unattended when he leaves the desk.**

This is a **private / secret project**. He does not want it on the Chrome Web Store. He only shares it with his developer.

He has run this stack for **more than a year** with a previous developer (he thought Bangladesh). He put in a lot of his own work (prompts, tags, examples, personals). It “worked pretty well, but not perfect.”

---

## 2. Jan’s long-term target (the real north star)

He said this first, before features:

> Make the bot as much human-like as possible. As close to perfect as possible. AI will never be human, but as close as possible.

Everything else is a means to that:

| He wants the customer to feel… | So the system must… |
| --- | --- |
| They are talking to a real person | Delay, wording, length, memory, and Slovenian grammar must not look generated |
| The same person over months/years | Remember player + customer facts; do not repeat intros; stay consistent |
| Worth paying / worth writing back | Especially on **trigger** messages after silence or after a picture/emoji |
| Not “talking to a script” | Unique replies; he constantly rewrites the system prompt to chase this |

**Human-likeness is the product. Token cost is the constraint.** If we cut cost and the bot gets colder, shorter, or more repetitive, we fail even if the invoice looks better.

---

## 3. What the client really wants (decoded)

Not a new site. Not a rewrite of the host platform. Not a public SaaS. Not “deploy to AWS.”

He wants **his existing Chrome extension improved**, while he keeps operating on the same third-party site.

Under that, three layers:

### Layer A — First paid project (what he already agreed with “the boss”)

**Lower cost per generated reply without breaking the current workflow.**

Evidence:

- He already discussed this as “the first project.”
- He called input context **“the biggest problem”** and **“very, very high.”**
- Live stats on the call: roughly **2,000 input tokens** for the last message, **~62 output tokens**, cost about **$0.006–$0.012** average. Nur later referenced ~**9,600** context tokens. Output is tiny; **input is the bill.**
- He already turned **Learn examples down to 5** because more tagged examples = more tokens = more money.
- He tried **Grok**; it felt “very, very expensive,” then he went back to OpenAI.
- **+ Add** and **Report bad suggestion** made costs “through the roof.” He stopped using them. Removal is optional; the logic is “not implemented the right way.”

This is the scoped, billable, near-term job: **same extension, cheaper generations, same or better reply quality.**

### Layer B — What he will judge us on (even if not in the SOW)

Quality of the **relationship**, not just cheaper tokens:

1. Replies still feel like **him / the player**, in **Slovenian**.
2. **Auto mode** still runs for hours while he is away, until he turns it off.
3. **Suggest** still gives a usable alternate phrasing he can edit, insert, or insert-and-send.
4. **Learn** still grows his example bank by tag.
5. **Trigger replies** still re-activate quiet customers and still handle picture / kiss / heart / Klaps / empty-message events.
6. **Message length** settings actually feel right (today: “okay, but not very, very good”).
7. He can still **change the system prompt himself** all the time. That control is part of the product.
8. Timing still looks human. The **~10 second wait before send is intentional**, not a bug. A 300-character reply in 10 seconds looks fake to the customer. Generation itself is ~20 seconds today (first 10s he described as not starting / wait-for-realism).

### Layer C — What he suspects but deferred

After a year he is **losing faith in the architecture itself** (tag → sample N example messages → giant system prompt). He said maybe this is not the best option — **then immediately: do the first project now, talk about that later.**

Do **not** rebuild the memory/tag system in v1 unless cost work proves it is required. He wants a conservative first delivery, then a bigger conversation.

---

## 4. First-project modification scopes (detailed)

These are the change areas implied by the call. Ordered by how strongly Jan pushed them.

### Scope 1 — Token / cost optimization (primary)

**Target:** Cut input tokens and $ / message. Keep output short (already short). Keep quality.

What burns tokens today (from his walkthrough + how the extension works):

- A large, constantly edited **system prompt**
- **Conversation history** (multi-year threads — this is the silent killer)
- **Tagged writing-style examples** (N per tag; he already cut N to 5)
- Personal logbooks (player + customer)
- Previous AI replies / suggested flow / bad-response lists
- The unused **+ Add** and **Report bad suggestion** paths (when used)

What “done” looks like for him:

- Typical message cost **below** the current ~$0.006–$0.012 band, or the same cost with clearly better replies
- He can still pick how many examples to use (he thinks in “5 messages per tag”)
- He understands *why* a generation was expensive (stats already exist; they should stay honest)

What he did **not** ask for: a cheaper model if quality drops. Nur suggested GPT mini-class models. Jan did not adopt that as a requirement. He cares about **consistency**. Mini models are an experiment, not the brief.

### Scope 2 — Prompt and context packing (primary, overlaps Scope 1)

He changes the system prompt constantly — “different rules, different conditions” — to chase better human feel.

He will **send the current prompts separately**. Treat that file as source of truth for wording, not only what is already in the repo.

Optimization he will accept:

- Shorter prompt text that still encodes the same rules
- Less redundant history / examples / personals in the request
- Structured personals used correctly so the model is not fed the same fact three times

Nur’s advice on the call (Jan agreed): put facts in the **right fields** (name, age, city, job, sex preference, others). Dumping age into “others” wastes tokens and weakens the source of truth. That is both an **operator habit** and a **product** issue (extraction + merge already exist in code).

### Scope 3 — Message length behavior (secondary, quality)

UI already has Fixed / Range / Random (and in code, Variation). Jan said length control **works okay but is not very good.**

He and “the boss” already talked about this on the first project.

**Expectation:** When he sets 80–150 (or similar), replies should land in that band more reliably, without sounding like the model is counting out loud, and without padding garbage to hit a number.

This is a quality + cost issue (overlong drafts waste output; failed length causes regenerate loops in the content script).

### Scope 4 — Tag + Learn example system (keep, tighten, do not replace)

Two families:

**Normal tags** (tone of a normal customer message):

- flirty, soft, question, erotic
- mixes: flirty+soft, flirty+question, flirty+erotic, soft+question, soft+erotic, question+erotic

**Trigger tags** (special platform/customer events):

| Trigger (as Jan explained) | Meaning |
| --- | --- |
| Leere Nachricht | Customer sent a **picture** (empty/blank message) |
| [kiss] | Kiss emoji |
| [heart] | Heart emoji |
| Klaps | Some kind of picture / kiss+slap style event (he was not 100% sure) |
| Please reactivate the user | Platform asks him to **poke** a customer who has been gone days/weeks so they write again |

Flow he demonstrated:

1. Bot **recognizes** the incoming message and **picks a tag**.
2. It pulls **N example messages** for that tag (he showed N = 5).
3. Those examples steer style.
4. **Learn:** he types (or just sent) a message, tag is chosen, he hits Learn → message is **sent to the customer** and **saved** under that tag for future examples.

Same tag holds **many** different example messages. He has a lot of erotic / question examples.

**Modification scope:** do not remove tags. Make selection + sampling cheaper and more relevant. Trigger examples should stay few (already a separate, smaller limit in the product).

### Scope 5 — Suggest / Insert / Auto (keep behavior, watch cost and timing)

| Control | What Jan uses it for | Expectation |
| --- | --- | --- |
| **Suggest** | “How would the bot say this another way?” Same intent, different words | Fast enough, editable, not a huge extra bill if he retries |
| **Insert text** | Drop suggestion into the box so he can add/delete | Must stay editable |
| **Insert & send** | Send without further edit | Must still look human (delay) |
| **Auto** | Walk away for hours; bot keeps answering until he stops it | This is the money feature. Do not break unattended loop |
| **Learn** | Grow the style bank and send | Keep send + save together as he described |

**+ Add suggested message** and **Report bad suggestion:** he does not use them. Not mandatory to delete. If we keep them, **fix the cost logic** or he will never touch them.

### Scope 6 — Human timing (do not “optimize away”)

Nur heard “10 seconds” and treated it as slowness to fix. Jan’s actual rule:

- If a long reply arrives too fast, the **customer detects the bot**.
- First ~10 seconds of the cycle is **deliberate realism**, not only model latency.
- End-to-end felt ~20 seconds on the call.

**Target:** keep a **human-looking delay**, preferably smarter than a flat 10s (e.g. scale wait with character count). Do not make Auto instant. Confirm any timing change with Jan before shipping.

### Scope 7 — Personals / “logbook” (quality + tokens)

Left: **customer** facts. Right: **player** (the persona he plays).

Fields he named: name, age, city, job, sex preference, others. All in **Slovenian**.

His job today: when someone says “I play sports” or “I have this job,” he (or the bot) must write it into the logbook. The bot then uses those facts in later replies.

**Expectation:**

- Facts stay on the correct side (customer vs player).
- Bot uses them naturally (city, job, hobbies) without dumping the block verbatim.
- Updates should not bloat “others” or duplicate structured fields.
- This is how a 5-year customer still feels known.

### Scope 8 — Platform / ops constraints (must not break)

- Third-party Angular chat UI. We **only** improve the extension overlay.
- Need **login credentials** for the live site so we can test (he offered this). There is **no Mongo/.env server**. Storage is browser `chrome.storage` + IndexedDB. Asking him for a database URL confused him — that is on us, not him.
- Load unpacked `dist`; no hosting project.
- Multi-tab / logout / “disconnect other tabs” and the 8-minute idle logout are real operational pain. The extension already tries to auto-dismiss the multi-tab modal.
- Messages are not always available; live testing depends on real incoming chats.

### Scope 9 — Explicitly out of scope for this first project

| Idea that came up | Verdict from Jan |
| --- | --- |
| Build a site like moderationinterface.com | **No.** Use the same site + improve his extension |
| Publish to Chrome marketplace | **No.** Secret project |
| Move off the extension to a server | Not now. Extension was chosen because it was cheapest; he is “open to other things” only **step by step** after this project |
| Replace OpenAI with free Hugging Face models | Nur floated it; Jan did not request it |
| Redesign the whole tag/example “system itself” | He wants to **revisit later**, not in project 1 |
| Mandatory removal of unused buttons | Optional |

---

## 5. Targets (measurable)

Use these as acceptance targets unless Jan revises them after he sends prompts.

### Cost

- **Baseline (his numbers):** about **$0.006–$0.012** per generation; input thousands of tokens; output ~60–80 tokens.
- **Target:** a clear, repeatable drop in **input tokens** on a long thread (the 2021-style customer is the real test, not an empty chat).
- **Guardrail:** do not raise output cost or force a second generation so often that savings disappear (the content script already regenerates if a reply is “too short”).

### Quality

- Slovenian, in-character, not repeating old intros.
- Uses player vs customer personals correctly.
- Length settings feel better than today.
- Trigger messages still re-engage; they must not sound like a generic blast.
- Auto can run unattended for hours.

### UX / workflow

- Learn / Suggest / Insert / Insert & send / Auto still present and understandable.
- He can still edit the system prompt from the popup.
- Stats still show cost, model, input/output tokens (he uses this to police spend).
- Unused costly buttons: hide, disable, or fix — do not leave a foot-gun.

### Privacy

- Extension stays private (load-unpacked / shared zip). No store listing.

---

## 6. Expectations (how Jan will work with us)

- **Step by step.** He said this twice. First project first. Architecture debate later.
- He will send **prompts later** and **the extension package** again. Wait for those before treating the repo prompt as final.
- He will give **site login credentials**. He does not know infra words (AWS, .env, Mongo). Speak in “login to the chat site + the extension zip.”
- He expects communication on **Fiverr chat** for credentials and follow-ups.
- He expects us to **review the codebase** and then tell him what we need — he should not have to guess engineering asks.
- He is proud of the current system and protective of it. Critique the **cost mechanics**, not his taste or the year of prompt work.
- Live demos depend on incoming messages. Test plans must not assume a constant stream.

Nur on the call sometimes talked past him (new site? .env? Hugging Face? cut the 10s wait?). Jan kept pulling back to: **improve this extension, cut cost, keep it human, keep Auto.** Align the team to Jan, not to the tangents.

---

## 7. What “success” means in Jan’s head

If we only reduce tokens on a short test chat, he will not feel it.

He will feel success when:

1. A **long, old customer** still gets a warm, specific Slovenian reply.
2. The **stats** on that reply are cheaper than $0.006–$0.012 for the same kind of context.
3. He can hit **Auto**, leave for several hours, and not come back to dead chats, bans from looking robotic, or a ruined 5-year thread.
4. When the platform says **reactivate**, the poke message gets an answer.
5. He still has his **prompt box and tags** — we did not take away his control.

That is the job.

---

## 8. Risks and ambiguities to resolve

1. **History length vs cost.** His best customers have the longest histories. Naive truncation can destroy the “known for years” effect. Need a smart summary / window, not “last 10 lines only,” unless he approves.
2. **Other agents on the same customer.** Style breaks when a stranger agent writes in the thread. The bot must not blindly imitate that or contradict it. He flagged this; we did not design a solution on the call.
3. **10s realism delay vs Nur’s instinct to shorten it.** Product decision; ask before changing.
4. **Model choice.** He wants consistency and lower cost. Mini/Grok are options, not mandates. Grok already failed him on price (possibly because the same huge prompt was sent to an expensive model).
5. **Prompt ownership.** He will send the latest prompt. Do not “optimize” the repo default and ship if his live prompt differs.
6. **Trigger meaning.** Leere Nachricht = picture; Klaps still fuzzy. Confirm against live events before changing trigger copy.
7. **Learn sends the message.** That is his mental model. Changing Learn to “save only” would surprise him.
8. **Secret project.** No screenshots, store listing, or public repo that exposes his live prompts/keys.

---

## 9. Recommended scope statement (for the team)

**In scope (project 1)**

- Keep the current Chrome extension on the existing third-party chat site.
- Reduce **input-token cost** of Suggest / Auto / personals-tagging calls.
- Tighten prompt + history + example packing; keep his ability to edit the system prompt.
- Make message-length targeting more reliable.
- Keep Learn / tags / triggers / Suggest / Auto.
- Neutralize or fix the two high-cost unused buttons.
- Preserve human-like send delay (tunable, not removed).
- Test on live credentials he provides.

**Out of scope (project 1)**

- New chat website or hosting.
- Chrome Web Store.
- Full memory-architecture replacement (his “maybe this system is wrong” idea).
- Mandatory model migration to mini / HF / Grok.

**Later (only after project 1)**

- Whether tags + raw example injection is the right long-term design.
- Whether the extension should become a hosted service now that the business “goes very good.”

---

## 10. One-sentence brief

Jan wants a **private Chrome extension that can sit on a third-party paid-chat site, talk like a specific Slovenian person for years, re-engage people after silence, and run on Auto while he is away — and he wants that to cost less per message without becoming less human.**
