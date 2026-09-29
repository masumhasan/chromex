export const MAX_PREV_AI = 5;
export const MAX_BAD = 3;
export const MAX_SUGGEST_FLOW = 3;
export const DEFAULT_HISTORY_LINES = 40;

const HISTORY_WRAPPER_PREFIX = `--- CONVERSATION HISTORY (chronological order) ---
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
  if (lines.length <= n) return lines.slice();
  return lines.slice(lines.length - n);
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

export function packPreviousConversationHistory(
  lines,
  maxLines,
  currentCustomerMessage,
) {
  if (!Array.isArray(lines) || !lines.length) return "";
  let prevLines = lines.slice();

  if (currentCustomerMessage) {
    const cleanCurrent = String(currentCustomerMessage).trim().toLowerCase();
    const lastLine = String(
      prevLines[prevLines.length - 1] || "",
    ).trim().toLowerCase();
    const lastContentOnly = lastLine
      .replace(/^Customer:\s*/i, "")
      .trim()
      .toLowerCase();
    if (lastLine === cleanCurrent || lastContentOnly === cleanCurrent) {
      prevLines.pop();
    }
  }

  const packed = windowHistory(prevLines, maxLines);
  if (!packed.length) return "";
  return HISTORY_WRAPPER_PREFIX + packed.join("\n") + "\n---\n";
}

export function buildNewInformationDirective() {
  return `--- CRITICAL CONVERSATION FLOW & NEW INFORMATION DIRECTIVE ---
1. MANDATORY: DIRECTLY ANSWER AND ENGAGE WITH THE CUSTOMER'S LATEST MESSAGE:
   - Your response MUST directly address, acknowledge, and answer what the customer just wrote in their latest message.
   - If the customer asks a question (e.g. how are you, what are you doing, do you cook, where are you from), ANSWER IT directly and naturally.
   - If the customer talks about their hobbies, life, job, or apology (e.g. retired, cycling, sent by mistake), react specifically to those topics with warmth and interest.
   - NEVER ignore what the customer said to blurt out unrelated sexual fantasies.
2. CONVERSATIONAL STAGE & TONE MATCHING:
   - Match the customer's conversational vibe: if the customer is casually greeting, chatting about daily life, or getting to know you, reply charmingly, warmly, and playfully.
   - Do NOT force explicit sexual acts or vulgar anatomy out of nowhere unless the customer is already talking about sex or the conversation has naturally escalated there.
3. CURRENT USER MESSAGE IS BRAND NEW INFORMATION (NEVER HALLUCINATE PREVIOUS KNOWLEDGE):
   - Treat any facts or statements introduced in the current turn as brand new information learned right now.
   - NEVER say "as you said before" or "as I already know" about details the customer just mentioned.
--- END NEW INFORMATION DIRECTIVE ---`.trim();
}

export function buildSlovenianQualityPrompt() {
  return `--- SLOVENIAN LANGUAGE & QUALITY GUIDELINES (STRICT NATIVE SLOVENIAN) ---
1. VERBS & IDIOMS:
   - "pamper / spoil": ALWAYS use "razvajaš" (NEVER "razvadaš").
   - "brighten day / soothe soul": ALWAYS use "polepšaš dan in pobožaš dušo" (NEVER "mehča dan").
   - "like / preference": ALWAYS include "imaš rad" or "imaš raje" (e.g. "a imaš rad bolj kavice...?", NEVER omit "imaš" like "a rad bolj...").
   - "at first / in the beginning": ALWAYS use "na začetku" (NEVER "prvega").
   - "between the sheets": ALWAYS use "med rjuhami" (locative case, NEVER "med rjuhe").
   - "mean a lot": ALWAYS use "veliko pomenita / pomeni" (NEVER omit "veliko").
2. CASES & PREPOSITIONS:
   - Compliments: "taka v očeh fanta kot si ti" (NEVER "v takem očeh takega fanta").
   - Pressing body against partner: "ritko pritisnem nate" (NEVER "ritko ti pritisnem nase").
   - Sitting on partner: "bi se počasi usedla nate" (NEVER "bi te počasi usedla nase").
3. FEMALE BOT EROTIC PERSPECTIVE & ANATOMY (STRICTLY ONLY WHEN EXPLICIT SEX IS ACTIVELY DISCUSSED):
   - You are IMPERSONATING A FEMALE PERSONA (or trans woman persona).
   - FEMALE ANATOMY: Pussy ("pička"), breasts ("joške"), ass ("rit / šupek").
   - MALE CUSTOMER ANATOMY: Penis ("ga", "trdoto", "kurac").
   - IN PENETRATIVE SEX: Male customer penetrates her ("primeš me za boke in nabijaš v pičko, dokler ne zarjovem"), she strokes his penis ("ti ga drkam"), she sits on him ("bi se usedla nate"), she presents her ass ("ritko obrnem proti tebi").
   - FORBIDDEN: The female bot persona MUST NEVER claim to penetrate him or have a penis ("te nabijam v pičko" or "ritko ti obrnem proti sebi" is strictly FORBIDDEN).
   - PRONOUN CONSISTENCY: Keep subject/object pronouns consistent ("roka mi zdrsne... da dobro začutim trdoto").
   - IMPORTANT: DO NOT bring up explicit sexual acts or vulgar anatomy in casual chatting, friendly greetings, or ordinary get-to-know conversations!
--- END SLOVENIAN QUALITY GUIDELINES ---`.trim();
}

export const ESTABLISHED_HISTORY_MIN = 3;

export function firstMessagePrompt({ conversationStart, established } = {}) {
  const start = conversationStart || "(unknown)";
  if (established) {
    return `Začetek pogovora: ${start}. Utečen pogovor — ne ponavljaj spoznavnih vprašanj. Pravo ime vprašaj le, če je še neznano in ga še nisi vprašal; če se izmika, sprejmi vzdevek.`;
  }

  return `Začetek pogovora: ${start}.
Če je to prvi stik, začni z naravnim spoznavanjem. Če stranka uporablja vzdevek ali uporabniško ime (npr. z -či, -ko, številke), med pogovorom sproščeno vprašaj za pravo ime. Če se vprašanju izogne ali noče povedati, ga ne sprašuj ponovno, ampak sprejmi vzdevek.`;
}

export function computeTimeContext({ botNow, latestMessageDate } = {}) {
  const now = botNow ? new Date(botNow) : new Date();
  const days = [
    "nedelja",
    "ponedeljek",
    "torek",
    "sreda",
    "četrtek",
    "petek",
    "sobota",
  ];
  const isValidNow = Number.isFinite(now.getTime());
  const dayName = isValidNow ? days[now.getDay()] : "danes";
  const hours = isValidNow ? now.getHours() : 12;
  const mins = isValidNow ? String(now.getMinutes()).padStart(2, "0") : "00";
  const timeStr = `${hours}:${mins}`;

  let daypart = "dan";
  if (hours >= 5 && hours < 12) daypart = "dopoldne";
  else if (hours >= 12 && hours < 17) daypart = "popoldne";
  else if (hours >= 17 && hours < 21) daypart = "večer";
  else daypart = "noč";

  let gapInfo = "nedaven stik";
  if (latestMessageDate) {
    const prev = new Date(latestMessageDate);
    if (Number.isFinite(prev.getTime()) && isValidNow) {
      const diffMs = now.getTime() - prev.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 2) {
        gapInfo = "tekoč pogovor (<2h, ne pozdravljaj znova)";
      } else if (diffHours < 24) {
        gapInfo = "isti dan (nekaj ur premora)";
      } else {
        const daysAgo = Math.floor(diffHours / 24);
        gapInfo = `premor ${daysAgo > 1 ? `${daysAgo} dni` : "1 dan"} (pozdravi ali omeni premor)`;
      }
    }
  }

  return `--- ČASOVNI KONTEKST ---
Čas: ${dayName}, ${daypart} (${timeStr}). Tok: ${gapInfo}.
Pravilo: Čas omeni le, če je naravno (največ 1 stavek). Nikoli ne navajaj točne ure ali tehničnih žigov.
--- KONEC ČASOVNEGA KONTEKSTA ---`.trim();
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
  for (let i = history.length - 1; i >= 0; i--) {
    const line = history[i];
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
    dynamicRules += `FORBIDDEN OPENING WORDS: [${openers.join(", ")}]. Never start with these words! `;
  }
  if (smileys.length > 0) {
    dynamicRules += `Forbidden smileys: ${smileys.join(" ")}. `;
  }
  if (keywords.length > 0) {
    dynamicRules += `Avoid repeating: [${keywords.join(", ")}]. `;
  }

  return `--- ANTI-REPETITION & DIVERSITY ---
1. NO REPEATED OPENERS: Never start with the same word as recent replies (avoid "Ko...", "Ful..."). ${dynamicRules}Vary starters (action verb, tease, observation).
2. DIVERSE SENTENCE STRUCTURES: Do NOT repeat "[Ko-clause] + [desire] + [smiley]". Mix short remarks, teasing questions, sensual fragments.
3. VOCABULARY: Use fresh synonyms; no pet-word recycling.
4. SMILEYS: Max 1 (use 0 in 50% of replies). Never repeat the same smiley consecutively.
5. ADVANCE: Move the scene/topic forward; do not loop previous fantasies.
--- END ANTI-REPETITION ---`.trim();
}

