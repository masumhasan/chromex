export const MAX_PREV_AI = 5;
export const MAX_BAD = 3;
export const MAX_SUGGEST_FLOW = 3;
export const DEFAULT_HISTORY_LINES = 40;

const HISTORY_WRAPPER_PREFIX = `Use this carefully and ensure you don't repeat any introductions or anything else that has already taken place. This determines
    Even if its not there in the conversation history you should be able to imply it. Always advance the conversation to new topics and concepts without repeating.\n---\n CONVERSATION HISTORY(latest to oldest):\n`;

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
