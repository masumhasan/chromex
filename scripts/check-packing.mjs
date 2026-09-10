import {
  approxTokens,
  capList,
  delta,
  isTriggerCustomerMessage,
  MAX_BAD,
  MAX_PREV_AI,
  MAX_SUGGEST_FLOW,
  omitEmptySection,
  pctChange,
  DEFAULT_HISTORY_LINES,
  packConversationHistory,
  triggerTagFromMessage,
  looksLikeNewPersonalFact,
  firstMessagePrompt,
  recentThenSample,
  windowHistory,
} from "../src/promptPacking.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("check-packing FAIL:", msg);
    process.exit(1);
  }
}

assert(omitEmptySection("Bad responses", "") === "", "blank section omitted");
assert(omitEmptySection("Bad responses", "   ") === "", "whitespace section omitted");

const filled = omitEmptySection("Examples", "hello there");
assert(filled.includes("Examples"), "non-blank section includes title");
assert(filled.includes("hello there"), "non-blank section includes body");

const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const last3 = capList(ten, 3);
assert(last3.length === 3, "capList length 3");
assert(last3[0] === 8 && last3[2] === 10, "capList keeps last 3");
assert(capList(null, 3).length === 0, "capList non-array is []");
assert(MAX_PREV_AI === 5 && MAX_BAD === 3 && MAX_SUGGEST_FLOW === 3, "cap constants");
const hundredPrev = Array.from({ length: 120 }, (_, i) => `ai-${i}`);
assert(capList(hundredPrev, MAX_PREV_AI).length === 5, "120 prev AI → last 5");
assert(capList(hundredPrev, MAX_BAD).length === 3, "capList respects MAX_BAD");
assert(
  capList(hundredPrev, MAX_SUGGEST_FLOW).length === 3,
  "capList respects MAX_SUGGEST_FLOW",
);

assert(isTriggerCustomerMessage("[kiss]") === true, "[kiss] is trigger");
assert(
  isTriggerCustomerMessage("(Leere Nachricht)") === true,
  "(Leere Nachricht) is trigger",
);

const hundred = Array.from({ length: 100 }, (_, i) => `line-${i}`);
const windowed = windowHistory(hundred, 40);
assert(windowed.length === 40, "windowHistory 100→40");
assert(windowed[0] === "line-0", "windowHistory keeps latest-first prefix");

assert(DEFAULT_HISTORY_LINES === 40, "DEFAULT_HISTORY_LINES is 40");
const packed40 = packConversationHistory(hundred, DEFAULT_HISTORY_LINES);
assert(packed40.includes("line-0"), "packed history includes latest line");
assert(!packed40.includes("line-99"), "packed history drops old lines at default 40");
assert(
  (packed40.match(/^line-/gm) || []).length === 40,
  "packConversationHistory 100→40 lines",
);

const packedAll = packConversationHistory(hundred, 0);
assert(
  (packedAll.match(/^line-/gm) || []).length === 100,
  "packConversationHistory maxLines 0 → all 100",
);
assert(packConversationHistory([], 40) === "", "empty history omits section");
assert(packConversationHistory(null, 40) === "", "non-array history omits section");

const fortyChars = "1234567890123456789012345678901234567890";
assert(fortyChars.length === 40, "fixture is 40 chars");
assert(approxTokens(fortyChars) === 10, "approxTokens(40 chars) === 10");

assert(delta(10000, 6000) === -4000, "delta 10000→6000 is -4000");
assert(pctChange(10000, 6000) === -40, "pctChange 10000→6000 is -40");

assert(triggerTagFromMessage("[kiss]") === "(trigger) [kiss]", "kiss → tag");
assert(
  triggerTagFromMessage("Customer: [heart]") === "(trigger) [heart]",
  "heart → tag",
);
assert(
  triggerTagFromMessage("(Leere Nachricht)") === "(trigger) Leere Nachricht",
  "leere → tag",
);
assert(
  triggerTagFromMessage("[Please reactivate the user!]") ===
    "(trigger) Please reactivate the user!",
  "reactivate → tag",
);
assert(triggerTagFromMessage("[slap]") === "(trigger) [Klaps]", "slap → Klaps");
assert(triggerTagFromMessage("[Klaps]") === "(trigger) [Klaps]", "Klaps → tag");
assert(triggerTagFromMessage("hello there") === null, "normal message is not trigger");

assert(looksLikeNewPersonalFact("ok") === false, "ok skips extraction");
assert(looksLikeNewPersonalFact("haha") === false, "haha skips extraction");
assert(looksLikeNewPersonalFact("[kiss]") === false, "trigger is not a new fact");
assert(looksLikeNewPersonalFact("Imam 28 let") === true, "age fact extracts");
assert(
  looksLikeNewPersonalFact(
    "Živim v Ljubljani in delam kot inženir, imam dva otroka.",
  ) === true,
  "long fact-shaped message extracts",
);

const fmNew = firstMessagePrompt({
  conversationStart: "8 Nov 2021",
  established: false,
});
const fmEst = firstMessagePrompt({
  conversationStart: "8 Nov 2021",
  established: true,
});
assert(fmEst.length < fmNew.length, "established first-message is shorter");
assert(fmEst.includes("8 Nov 2021"), "established keeps start date");
assert(fmNew.includes("get to know"), "new chat keeps onboarding");
assert(fmEst.includes("real name"), "established keeps nickname rule");

const recentPool = Array.from({ length: 30 }, (_, i) => i + 1);
const recentSample = recentThenSample(recentPool, 5, 3);
assert(recentSample.length === 5, "recentThenSample returns n items");
assert(
  recentSample.every((x) => x >= 16),
  "recentThenSample draws from last n*3 (16–30)",
);
assert(recentThenSample([1, 2, 3], 5, 3).length === 3, "fewer than n uses full pool");
assert(recentThenSample([], 5, 3).length === 0, "empty pool");

console.log("check-packing: ok");
