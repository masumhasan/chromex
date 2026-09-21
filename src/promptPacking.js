export const MAX_PREV_AI = 5;
export const MAX_BAD = 3;
export const MAX_SUGGEST_FLOW = 3;
export const DEFAULT_HISTORY_LINES = 40;

const HISTORY_WRAPPER_PREFIX = `Use this history to understand context, tone, and what has already taken place.
Never repeat greetings, introductions, topics, or sentence structures that have already occurred.
Always bring fresh energy, varied sentence openings, and narrative progression.
---
CONVERSATION HISTORY (latest to oldest):
`;

export function chars(str) {
  if (str == null) return 0;
  return String(str).length;
}

export function approxTokens(str) {
  return Math.ceil(chars(str) / 4);
}

export function isBlank(str) {
  if (str == null) return true;
  return String(str).trim() === "";
}

export function omitEmptySection(title, body) {
  if (isBlank(body)) return "";
  const heading = String(title ?? "").trim() || "Section";
  return `\n---\n${heading}:\n${String(body).trim()}\n---\n`;
}

export function capList(arr, max) {
  if (!Array.isArray(arr)) return [];
  const n = Math.max(0, Math.floor(Number(max) || 0));
  if (n <= 0) return [];
  if (arr.length <= n) return arr.slice();
  return arr.slice(arr.length - n);
}

export function isTriggerTag(tag) {
  return typeof tag === "string" && tag.trim().startsWith("(trigger)");
}

export function isTriggerCustomerMessage(text) {
  return triggerTagFromMessage(text) != null;
}

export function triggerTagFromMessage(text) {
  const t = String(text ?? "").toLowerCase();
  if (!t.trim()) return null;

  if (t.includes("leere nachricht")) return "(trigger) Leere Nachricht";
  if (t.includes("please reactivate the user")) {
    return "(trigger) Please reactivate the user!";
  }
  if (t.includes("[kiss]")) return "(trigger) [kiss]";
  if (t.includes("[heart]")) return "(trigger) [heart]";
  if (t.includes("[klaps]") || t.includes("[slap]")) {
    return "(trigger) [Klaps]";
  }

  return null;
}

export function latestCustomerText(history) {
  if (!Array.isArray(history) || !history.length) return "";

  const strip = (line) => {
    const raw = String(line ?? "");
    const m = raw.match(/^Customer:\s*([\s\S]*)$/i);
    return m ? m[1] : raw;
  };

  for (let i = history.length - 1; i >= 0; i--) {
    const line = String(history[i] ?? "");
    if (/^You:/i.test(line.trim())) continue;
    const body = strip(line);
    if (triggerTagFromMessage(body) || /^Customer:/i.test(line)) {
      return body;
    }
  }

  return strip(history[history.length - 1]);
}

/**
 * Conservative personal-fact detector.
 * Return true unless the line is clearly not adding facts (then skip extraction).
 * When unsure, return true so we still call the personals AI.
 */
export function looksLikeNewPersonalFact(latestCustomerText) {
  if (triggerTagFromMessage(latestCustomerText)) return false;

  const t = String(latestCustomerText ?? "").trim();
  if (!t) return false;

  const lower = t.toLowerCase();
  const compact = lower.replace(/\s+/g, " ");

  if (
    /\b\d{1,3}\s*(let|yo|yrs?|years?)\b/i.test(t) ||
    /\b(starost|age|ime je|my name|živim|zivim|mesto|city|delam|job|poklic|from)\b/i.test(
      lower,
    )
  ) {
    return true;
  }

  const chitChat =
    /^(ok+|okay|okej|haha+|hehe+|lol+|lmao|ja|ne|yes|no|nope|hmm+|mhm+|aha+|hi+|hey+|yo|čao|ciao|zdravo|živjo|thx|thanks|hvala)[.!?]*$/i;
  if (t.length <= 24 && chitChat.test(compact)) return false;
  if (t.length <= 4) return false;

  return true;
}

export function windowHistory(lines, maxLines) {
  if (!Array.isArray(lines)) return [];
  if (maxLines == null || maxLines === 0) return lines.slice();
  const n = Math.floor(Number(maxLines));
  if (!Number.isFinite(n) || n <= 0) return lines.slice();
  return lines.slice(0, n);
}

export function resolveHistoryMaxLines(value) {
  if (value == null || value === "") return DEFAULT_HISTORY_LINES;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_HISTORY_LINES;
  return Math.floor(n);
}

export function packConversationHistory(lines, maxLines) {
  const packed = windowHistory(lines, maxLines);
  if (!packed.length) return "";
  return HISTORY_WRAPPER_PREFIX + packed.join("\n") + "\n---\n";
}

export const ESTABLISHED_HISTORY_MIN = 8;

export function firstMessagePrompt({ conversationStart, established } = {}) {
  const start = conversationStart || "(unknown)";
  if (established) {
    return `Conversation started: ${start}.
This is an established conversation. Do not repeat intros or already-discussed topics; advance to new topics.
Nickname vs real name (Slovenian): only ask for a real name if it is still unknown. If you already asked and they ignored, refused, or dodged, do not ask again. Accept the nickname and move on.`;
  }

  return `Conversation started: ${start}.
  Use this to determine if its the first time messaging, and if so start with basic get to know question. Carefully refer to the history (if it exists) to keep the conversation flow natural.
   Do not repeat any questions or information that has already been discussed in the conversation history always advance to a new topic or conversation. 
   In Slovenian, you must differentiate between real names (e.g., Luka, Maja, Rok) and nicknames/usernames. Nicknames often end in diminutives like -či, -ek, -ki, -ko, -y (e.g., Majči, Luki, Roky), use common nouns (sonček, zmajček), or have numbers (marko123). If they are using a nickname or username, naturally ask for their real name during the flow of the conversation. 
   FALLBACK RULE: If you have already asked for their real name and they ignored it, refused, or dodged the question, DO NOT ask again. Accept the nickname/username and move on to keep the conversation natural and engaging.`;
}

export function delta(before, after) {
  const a = Number(before);
  const b = Number(after);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return b - a;
}

export function pctChange(before, after) {
  const a = Number(before);
  const b = Number(after);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return ((b - a) / a) * 100;
}

export function sampleRandomN(arr, n) {
  const k = Math.max(0, Math.floor(Number(n) || 0));
  if (!Array.isArray(arr)) return [];
  if (k <= 0) return [];
  if (arr.length <= k) return arr.slice();
  const copy = arr.slice();
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}

export function recentThenSample(arr, n, recentWindowMultiplier = 3) {
  if (!Array.isArray(arr) || !arr.length) return [];
  const k = Math.max(0, Math.floor(Number(n) || 0));
  if (k <= 0) return [];
  if (arr.length <= k) return arr.slice();

  const mult = Number(recentWindowMultiplier);
  const windowSize = Math.max(
    k,
    Math.floor(k * (Number.isFinite(mult) && mult > 0 ? mult : 3)),
  );
  const recent =
    arr.length <= windowSize ? arr.slice() : arr.slice(arr.length - windowSize);

  if (recent.length < k) return sampleRandomN(arr, k);
  return sampleRandomN(recent, k);
}

// ----------------------------------------------------
// 🛑 ANTI-REPETITION & HUMANIZATION UTILITIES
// ----------------------------------------------------

export function extractRecentYouMessages(history, maxCount = 5) {
  if (!Array.isArray(history)) return [];
  const max = Math.max(0, Math.floor(Number(maxCount) || 5));
  if (max === 0) return [];
  const youMessages = [];
  for (const line of history) {
    const s = String(line ?? "").trim();
    if (/^You:\s*/i.test(s)) {
      const text = s.replace(/^You:\s*/i, "").trim();
      if (text) {
        youMessages.push(text);
        if (youMessages.length >= max) break;
      }
    }
  }
  return youMessages;
}

export function extractOpeningWords(messages) {
  if (!Array.isArray(messages)) return [];
  const words = new Set();
  for (const msg of messages) {
    const s = String(msg ?? "").trim();
    const cleaned = s.replace(/^(?:You|Customer):\s*/i, "").trim();
    // Match the first word (Unicode letters)
    const match = cleaned.match(/^[\s"'„“»«([*~_]*([\p{L}]+)/u);
    if (match && match[1]) {
      words.add(match[1].toLowerCase());
    }
  }
  return Array.from(words);
}

export function extractSmileys(messages) {
  if (!Array.isArray(messages)) return [];
  const smileys = new Set();
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const asciiSmileyRegex = /(?:[:;=8][-o*']?[)D(/\\pP|3<>]|<3)/g;

  for (const msg of messages) {
    const s = String(msg ?? "");
    const emojis = s.match(emojiRegex);
    if (emojis) {
      for (const e of emojis) smileys.add(e);
    }
    const ascii = s.match(asciiSmileyRegex);
    if (ascii) {
      for (const a of ascii) smileys.add(a);
    }
  }
  return Array.from(smileys);
}

const SLOVENIAN_STOPWORDS = new Set([
  "tudi", "tako", "kako", "zakaj", "kdaj", "ampak", "toda", "vendar", "zato",
  "samo", "lahko", "bova", "bomo", "boste", "bodo", "bila", "bilo", "bili",
  "bile", "imel", "imela", "imeli", "mene", "tebe", "njega", "njo", "nama",
  "vama", "njima", "meni", "tebi", "njemu", "nam", "vam", "njim", "tega",
  "temu", "svoj", "svojo", "svoje", "svojih", "nekaj", "nekdo", "vedno",
  "nikoli", "tukaj", "seveda", "kajne", "kadar", "kjer", "kdor", "nekje",
  "sem", "si", "je", "sva", "ste", "smo", "bila", "bili", "boste", "bova",
  "boš", "bom", "bomo", "bodo", "veš", "vem", "veva", "veste", "vemo",
  "kaj", "kdo", "kateri", "katera", "katero", "tale", "tisto", "tisti",
  "tista", "res", "prav", "zelo", "bolj", "najbolj", "malo", "precej"
]);

export function extractRecentKeywords(messages, minLength = 4) {
  if (!Array.isArray(messages)) return [];
  const min = Math.max(1, Math.floor(Number(minLength) || 4));
  const regex = new RegExp(`[\\p{L}]{${min},}`, "gu");
  const keywords = new Set();
  for (const msg of messages) {
    const s = String(msg ?? "").toLowerCase();
    const words = s.match(regex) || [];
    for (const w of words) {
      if (!SLOVENIAN_STOPWORDS.has(w)) {
        keywords.add(w);
      }
    }
  }
  return Array.from(keywords).slice(0, 12);
}

export function buildAntiRepetitionPrompt({
  recentYouMessages = [],
  lastAISuggestion = [],
} = {}) {
  const combined = [];
  const seen = new Set();
  for (const m of [...(recentYouMessages || []), ...(lastAISuggestion || [])]) {
    const str = String(m ?? "").trim();
    if (str && !seen.has(str)) {
      seen.add(str);
      combined.push(str);
    }
  }

  const openers = extractOpeningWords(combined);
  const smileys = extractSmileys(combined);
  const keywords = extractRecentKeywords(combined);

  let dynamicRules = "";
  if (openers.length > 0) {
    dynamicRules += `- FORBIDDEN OPENING WORDS: Your recent messages started with: [${openers.join(", ")}]. YOU MUST NOT start your next message with any of these words!\n`;
  }
  if (smileys.length > 0) {
    dynamicRules += `- FORBIDDEN SMILEYS: Your recent messages used: ${smileys.join(" ")}. DO NOT reuse any of these smileys in this reply!\n`;
  }
  if (keywords.length > 0) {
    dynamicRules += `- AVOID REPEATING DISTINCTIVE WORDS/VERBS: Recently used: [${keywords.join(", ")}]. Do not repeat these exact words; use fresh synonyms!\n`;
  }

  return `--- STYLE DIVERSITY & ANTI-REPETITION (CRITICAL HUMANIZATION RULES) ---
You are chatting as a real, spontaneous human. Real people do not repeat conversational habits, formulas, or sentence openings.
Strictly adhere to the following rules:

1. ABSOLUTE BAN ON REPETITIVE SENTENCE OPENINGS:
- NEVER start 2 consecutive messages with the same word or clause pattern!
- DO NOT start with cliché repetitive openers such as "Ko...", "Ful...", "Kaj če...", "A veš...", "Opa...", "Joj...".
${dynamicRules ? dynamicRules.trim() + "\n" : ""}- Radically vary how your message begins: start directly with an action verb, a witty observation, a punchy tease, an unexpected exclamation, or a spontaneous short fragment.

2. DIVERSE SENTENCE STRUCTURES (NO FIXED FORMULAS):
- FORBIDDEN FORMULA: Do NOT repeatedly use "[Subordinate clause with Ko/Če...] + [Action/Desire] + [Smiley]".
- Radically vary your syntax: use short conversational fragments, direct playful statements, rhetorical questions, or sensual banter. Break predictable cadence.

3. VOCABULARY DIVERSITY & NO SLANG RECYCLING:
- Do not recycle favorite pet words (e.g., "ful", "porineš", "steče") across consecutive turns.
- Use natural, varied Slovenian vocabulary and rich synonyms.

4. SMILEY / EMOJI DISCIPLINE:
- Use at most ONE smiley in a message. In at least 50% of your messages, use ZERO smileys.
- NEVER use the exact same smiley two turns in a row, and never use more than one smiley in one message.

5. TOPIC & NARRATIVE PROGRESSION:
- Do not loop the same scenario, compliment, or fantasy with slightly changed words.
- Advance the interaction: introduce a new detail, respond to an unaddressed aspect of what the customer said, or playfully shift the topic.
--- END STYLE DIVERSITY & ANTI-REPETITION ---`.trim();
}

