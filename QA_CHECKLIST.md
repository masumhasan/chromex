# QA checklist — Project 1

Load unpacked **`dist/`** in Chrome (reload the extension after each rebuild). No API key is required to check the popup UI; live Suggest/Auto needs Jan’s keys and site login.

## Extension UI (popup)

- [ ] Learn / Suggest / Insert / Insert & Send / Auto still present on the chat page overlay
- [ ] 10s Auto wait still there (countdown before send)
- [ ] Settings: **History lines sent to AI** (All / 20 / 40 / 60 / 80)
- [ ] Stats: cost + token counts + prompt ledger
- [ ] Stats: **Save as Before** / **Save as After** comparison when both snapshots exist
- [ ] System prompt editor still saves
- [ ] + Add and Report buttons still there (arrays capped at 10)

## Cost / packing (after one Suggest or Auto)

- [ ] Ledger history lines ≈ selected window (40 default), not the full years-long scrape unless All (0)
- [ ] Empty examples / bad / suggestions sections are 0 in the ledger
- [ ] Triggers (kiss, heart, Klaps, Leere Nachricht, reactivate) do not fire a personals OpenAI call
- [ ] Short trigger replies do not auto-loop a second generation
- [ ] Normal short replies still regenerate if under 70/75

## Build artifacts (already verified 2026-09-10)

- [x] `dist/background.js`
- [x] `dist/content.js`
- [x] `dist/index.html`
- [x] `dist/manifest.json`
- [x] `dist/db-viewer.html`

## Live site (Jan / operator — cannot be finished in Cursor)

- [ ] Load `dist` unpacked, log into the chat site
- [ ] Long thread → Suggest/Auto → **Save as Before** (if not saved before packing; otherwise Save After on a similar thread)
- [ ] Compare Stats: input tokens and $ vs old ~$0.006–$0.012
- [ ] Trigger message + Auto for several incoming messages
- [ ] Replies still feel like the same Slovenian player

If quality drops: set **History lines → All (0)** and retest before reverting other changes.
