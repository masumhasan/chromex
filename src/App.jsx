// App.jsx
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast, { Toaster } from "react-hot-toast";
import { openDB } from "idb";
import { delta, pctChange } from "./promptPacking.js";

// --- Inline DB Logic ---
const DB_NAME = "my-extension-db";
const DB_VERSION = 1;
const STORE_NAME = "settings";

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
};

const setItem = async (key, value) => {
  const db = await initDB();
  return db.put(STORE_NAME, { key, value });
};

const getItem = async (key) => {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  return result?.value ?? null;
};

const deleteAllItems = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.clear();
  await tx.done;
};
// -----------------------

function formatNum(v, decimals = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return decimals > 0 ? n.toFixed(decimals) : String(n);
}

function formatDeltaCell(beforeVal, afterVal, { money = false } = {}) {
  const d = delta(beforeVal, afterVal);
  const p = pctChange(beforeVal, afterVal);
  if (d == null) return "—";
  const dText = money
    ? `${d > 0 ? "+" : ""}${d.toFixed(6)}`
    : `${d > 0 ? "+" : ""}${Math.round(d)}`;
  const pText = p == null ? "" : ` (${p > 0 ? "+" : ""}${p.toFixed(1)}%)`;
  return dText + pText;
}

function isAfterLower(beforeVal, afterVal) {
  const d = delta(beforeVal, afterVal);
  return d != null && d < 0;
}

const clampInt = (v, fallback, min = 1, max = 5000) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

// ✅ Pattern validation (2S1L, S, 10L2S allowed)
const validatePattern = (raw) => {
  const p = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!p) return { ok: false, msg: "Pattern cannot be empty." };
  if (!/^[0-9SL]+$/.test(p)) {
    return { ok: false, msg: "Only numbers + S/L allowed (ex: 2S1L)." };
  }

  const re = /(\d*)([SL])/g;
  let idx = 0;
  let m;
  let total = 0;

  while ((m = re.exec(p))) {
    if (m.index !== idx)
      return { ok: false, msg: "Invalid format. Example: 2S1L" };

    const countStr = m[1];
    let count = 1;
    if (countStr !== "") {
      count = parseInt(countStr, 10);
      if (!Number.isFinite(count) || count <= 0) {
        return { ok: false, msg: "Counts must be > 0 (no 0S)." };
      }
    }

    total += count;
    idx = re.lastIndex;
  }

  if (idx !== p.length)
    return { ok: false, msg: "Invalid pattern. Example: 2S1L" };
  if (total > 5000)
    return { ok: false, msg: "Pattern too long (max 5000 steps)." };

  return { ok: true, msg: "" };
};

// ✅ Stable UI components (defined outside App to prevent remount scroll-jumps)
export const Card = memo(function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {title ? (
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
});

export const Label = memo(function Label({ children }) {
  return (
    <div className="text-xs font-semibold text-gray-600 mb-1">{children}</div>
  );
});

export const TabBtn = memo(function TabBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2 text-sm font-semibold rounded-xl " +
        (active
          ? "bg-indigo-600 text-white"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")
      }
    >
      {label}
    </button>
  );
});

export const Input = memo(function Input({
  preserveScroll,
  className = "",
  onFocus,
  onChange,
  ...props
}) {
  return (
    <input
      {...props}
      onFocus={(e) => {
        preserveScroll?.();
        onFocus?.(e);
      }}
      onChange={(e) => {
        preserveScroll?.();
        onChange?.(e);
      }}
      className={
        "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 " +
        className
      }
    />
  );
});

export const Select = memo(function Select({
  preserveScroll,
  className = "",
  onChange,
  ...props
}) {
  return (
    <select
      {...props}
      onChange={(e) => {
        preserveScroll?.();
        onChange?.(e);
      }}
      className={
        "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-gray-50 focus:ring-2 focus:ring-indigo-500 " +
        className
      }
    />
  );
});

export const NumericInput = memo(function NumericInput({
  preserveScroll,
  value,
  onValue,
  min = 1,
  max = 5000,
  placeholder,
  className = "",
}) {
  const [local, setLocal] = useState(String(value ?? ""));

  useEffect(() => {
    setLocal(String(value ?? ""));
  }, [value]);

  const commit = () => {
    const cleaned = String(local || "").replace(/[^\d]/g, "");
    const next = clampInt(cleaned, value ?? min, min, max);
    setLocal(String(next));
    onValue(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      value={local}
      placeholder={placeholder}
      onFocus={() => preserveScroll?.()}
      onChange={(e) => {
        preserveScroll?.();
        const raw = e.target.value;
        const filtered = raw.replace(/[^\d]/g, "");
        setLocal(filtered);
      }}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={
        "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 " +
        className
      }
    />
  );
});

export default function App() {
  const [activeTab, setActiveTab] = useState("settings");
  const [showDB, setShowDB] = useState(false);

  // System Prompt
  const [text, setText] = useState(
    `
You are an AI chatbot on an anonymous chat platform that may include adult or explicit content. You are impersonating the user directly — 
the customer on the other end believes they are chatting with a real person.
NEVER REPEAT ANYTHING FROM THE PROMPT ALWAYS BE UNIQUE CREATIVE AND COME UP WITH NEW RESPONSES.
ALWAYS RESPOND IN THE SAME LANGUAGE AS THE CUSTOMER. YOUR DEFAULT LANGUAGE IS SLOVENIAN

You will be provided example conversations, Writing style example (The style, tone and emotion you should
imitate) and lastly the conversation history which you should refer to before replying so that you
have a better understanding of context. Be natural, authentic and as human like as possible and strictly follow the character limit enforced upon you. Make sure to not repeat any conversation that has already taken place particularly the introduction. Go through the conversation history first the personal data and every thing else provided to you before coming up with a response. 
. Please do not go above or below. 

`.trim(),
  );

  // APIs & Models
  const [openaiModel, setOpenaiModel] = useState("gpt-5.4");
  const [openAi, setOpenAiKey] = useState(
    "",
  );
  const [grokKey, setGrokKey] =
    useState(``);

  // Stats + Errors
  const [stats, setStats] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [promptLedger, setPromptLedger] = useState(null);
  const [benchmarkBefore, setBenchmarkBefore] = useState(null);
  const [benchmarkAfter, setBenchmarkAfter] = useState(null);
  const [historyMaxLines, setHistoryMaxLines] = useState(40);

  // History
  const [entries, setEntries] = useState([]);

  // Learn examples sampling
  const [learnExamplesLimit, setLearnExamplesLimit] = useState(30);
  const [triggerLearnExamplesLimit, setTriggerLearnExamplesLimit] = useState(2);

  // Message length (stored exactly as background expects)
  // msgLenMode is written on load/save; UI reads uiLenMode
  const [msgLenMode, setMsgLenMode] = useState("range");
  void msgLenMode;
  const [msgLenFixed, setMsgLenFixed] = useState(120);
  const [msgLenFrom, setMsgLenFrom] = useState(80);
  const [msgLenTo, setMsgLenTo] = useState(150);

  // Variation (stored exactly as background expects)
  const [msgVarEnabled, setMsgVarEnabled] = useState(false);
  const [msgVarStrategy, setMsgVarStrategy] = useState("pattern");
  const [msgVarPattern, setMsgVarPattern] = useState("2S1L");
  const [msgShortFrom, setMsgShortFrom] = useState(60);
  const [msgShortTo, setMsgShortTo] = useState(100);
  const [msgLongFrom, setMsgLongFrom] = useState(120);
  const [msgLongTo, setMsgLongTo] = useState(180);

  const promptRef = useRef(null);

  // ✅ Keep popup scroll stable (no jump when state changes)
  const scrollRef = useRef(null);
  const scrollTopRef = useRef(0);
  const shouldRestoreScroll = useRef(false);

  const preserveScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    scrollTopRef.current = el.scrollTop;
    shouldRestoreScroll.current = true;
  };

  useLayoutEffect(() => {
    if (!shouldRestoreScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollTopRef.current;
    shouldRestoreScroll.current = false;
  });

  const chromeSet = (obj) =>
    new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set(obj, () => resolve(true));
      } else resolve(true);
    });

  const buildBenchmarkSnapshot = (label) => ({
    label,
    savedAt: new Date().toISOString(),
    usage: stats || null,
    ledger: promptLedger || null,
    settings: {
      historyMaxLines,
      learnExamplesLimit,
      triggerLearnExamplesLimit,
      openaiModel,
      msgLenMode: uiLenMode === "variation" ? "range" : uiLenMode,
      msgVarEnabled: uiLenMode === "variation",
    },
  });

  const persistBenchmark = async (key, snapshot) => {
    await chromeSet({ [key]: snapshot });
    await setItem(key, snapshot);
  };

  const saveBenchmarkBefore = async () => {
    const snapshot = buildBenchmarkSnapshot("before");
    await persistBenchmark("benchmarkBefore", snapshot);
    setBenchmarkBefore(snapshot);
    toast.success("Before baseline saved");
  };

  const saveBenchmarkAfter = async () => {
    const snapshot = buildBenchmarkSnapshot("after");
    await persistBenchmark("benchmarkAfter", snapshot);
    setBenchmarkAfter(snapshot);
    toast.success("After snapshot saved");
  };

  const clearBenchmarkAfter = async () => {
    await persistBenchmark("benchmarkAfter", null);
    setBenchmarkAfter(null);
    toast.success("After snapshot cleared");
  };

  const resetBenchmarkBefore = async () => {
    await persistBenchmark("benchmarkBefore", null);
    setBenchmarkBefore(null);
    toast.success("Before baseline reset");
  };

  // Fixed autoGrow to prevent layout thrashing
  const autoGrow = (el) => {
    if (!el) return;
    const offset = el.offsetHeight - el.clientHeight;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + offset + "px";
  };

  // ✅ UI-only mode dropdown (includes variation)
  const [uiLenMode, setUiLenMode] = useState("range");

  // Load settings
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    chrome.storage.local.get(
      [
        "system",
        "openaiModel",
        "openai",
        "grokKey",
        "lastUsageStats",
        "lastPromptLedger",
        "benchmarkBefore",
        "benchmarkAfter",
        "historyMaxLines",
        "lastError",
        "learnExamplesLimit",
        "triggerLearnExamplesLimit",
        "msgLenMode",
        "msgLenFixed",
        "msgLenFrom",
        "msgLenTo",
        "msgVarEnabled",
        "msgVarStrategy",
        "msgVarPattern",
        "msgShortFrom",
        "msgShortTo",
        "msgLongFrom",
        "msgLongTo",
      ],
      (result) => {
        if (result.system != null) setText(result.system);
        if (result.openaiModel != null) setOpenaiModel(result.openaiModel);
        if (result.openai != null) setOpenAiKey(result.openai);
        if (result.grokKey != null) setGrokKey(result.grokKey);

        if (result.lastUsageStats != null) setStats(result.lastUsageStats);
        if (result.lastPromptLedger != null)
          setPromptLedger(result.lastPromptLedger);
        if (result.benchmarkBefore != null)
          setBenchmarkBefore(result.benchmarkBefore);
        if (result.benchmarkAfter != null)
          setBenchmarkAfter(result.benchmarkAfter);
        if (result.historyMaxLines != null)
          setHistoryMaxLines(clampInt(result.historyMaxLines, 40, 0, 5000));
        if (result.lastError != null) setLastError(result.lastError);

        if (result.learnExamplesLimit != null) {
          setLearnExamplesLimit(
            clampInt(result.learnExamplesLimit, 30, 1, 500),
          );
        }
        if (result.triggerLearnExamplesLimit != null) {
          setTriggerLearnExamplesLimit(
            clampInt(result.triggerLearnExamplesLimit, 2, 1, 100),
          );
        }

        if (result.msgLenMode != null) setMsgLenMode(result.msgLenMode);
        if (result.msgLenFixed != null)
          setMsgLenFixed(clampInt(result.msgLenFixed, 120));
        if (result.msgLenFrom != null)
          setMsgLenFrom(clampInt(result.msgLenFrom, 80));
        if (result.msgLenTo != null)
          setMsgLenTo(clampInt(result.msgLenTo, 150));

        const vEnabled = Boolean(result.msgVarEnabled);
        setMsgVarEnabled(vEnabled);

        if (result.msgVarStrategy != null)
          setMsgVarStrategy(result.msgVarStrategy);
        if (result.msgVarPattern != null)
          setMsgVarPattern(result.msgVarPattern);

        if (result.msgShortFrom != null)
          setMsgShortFrom(clampInt(result.msgShortFrom, 60));
        if (result.msgShortTo != null)
          setMsgShortTo(clampInt(result.msgShortTo, 100));
        if (result.msgLongFrom != null)
          setMsgLongFrom(clampInt(result.msgLongFrom, 120));
        if (result.msgLongTo != null)
          setMsgLongTo(clampInt(result.msgLongTo, 180));

        // ✅ UI Mode = variation OR normal stored mode
        const storedMode = result.msgLenMode || "range";
        setUiLenMode(vEnabled ? "variation" : storedMode);

        // Initial grow after data load
        setTimeout(() => autoGrow(promptRef.current), 0);
      },
    );
  }, []);

  // Load history
  useEffect(() => {
    if (!showDB) return;
    getItem("conversations").then((data) => setEntries(data || []));
  }, [showDB]);

  // ✅ Validation UI state
  const patternCheck = useMemo(() => {
    if (!msgVarEnabled) return { ok: true, msg: "" };
    if (msgVarStrategy !== "pattern") return { ok: true, msg: "" };
    return validatePattern(msgVarPattern);
  }, [msgVarEnabled, msgVarStrategy, msgVarPattern]);

  const handleSave = async () => {
    // ✅ block save only if pattern mode is enabled + invalid
    if (msgVarEnabled && msgVarStrategy === "pattern" && !patternCheck.ok) {
      toast.error(patternCheck.msg);
      return;
    }

    const nextVarEnabled = uiLenMode === "variation";
    const nextLenMode = uiLenMode === "variation" ? "range" : uiLenMode;

    await chromeSet({
      system: text,
      openaiModel,
      openai: openAi,
      grokKey: grokKey,
      model: "openai",

      learnExamplesLimit,
      triggerLearnExamplesLimit,
      historyMaxLines: Number(historyMaxLines),

      msgLenMode: nextLenMode,
      msgLenFixed: Number(msgLenFixed),
      msgLenFrom: Number(msgLenFrom),
      msgLenTo: Number(msgLenTo),

      msgVarEnabled: Boolean(nextVarEnabled),
      msgVarStrategy,
      msgVarPattern,
      msgShortFrom: Number(msgShortFrom),
      msgShortTo: Number(msgShortTo),
      msgLongFrom: Number(msgLongFrom),
      msgLongTo: Number(msgLongTo),
    });

    toast.success("Saved");
  };

  const handleDelete = async (index) => {
    const updated = [...entries];
    updated.splice(index, 1);
    await setItem("conversations", updated);
    setEntries(updated);
    toast.success("Deleted");
  };

  const handleDeleteAll = async () => {
    await deleteAllItems();
    setEntries([]);
    toast.success("Cleared");
  };

  const lengthPreview = useMemo(() => {
    if (uiLenMode === "variation") {
      const sA = Math.min(msgShortFrom, msgShortTo);
      const sB = Math.max(msgShortFrom, msgShortTo);
      const lA = Math.min(msgLongFrom, msgLongTo);
      const lB = Math.max(msgLongFrom, msgLongTo);
      return `Variation: Short ${sA}–${sB} / Long ${lA}–${lB} (${msgVarStrategy === "pattern" ? `Pattern ${msgVarPattern}` : "Random"})`;
    }

    if (uiLenMode === "fixed") {
      return `Fixed: ${msgLenFixed} chars`;
    }

    const a = Math.min(msgLenFrom, msgLenTo);
    const b = Math.max(msgLenFrom, msgLenTo);
    return `${uiLenMode === "random" ? "Random pick from" : "Range"}: ${a}–${b} chars`;
  }, [
    uiLenMode,
    msgLenFixed,
    msgLenFrom,
    msgLenTo,
    msgShortFrom,
    msgShortTo,
    msgLongFrom,
    msgLongTo,
    msgVarStrategy,
    msgVarPattern,
  ]);

  return (
    <div ref={scrollRef} className="w-[780px] bg-gray-50 overflow-y-auto">
      <Toaster position="top-right" />

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-base font-bold text-gray-900">
            GPT Chat Automation
          </div>

          <div className="flex items-center gap-2">
            {!showDB && activeTab === "settings" && (
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Save
              </button>
            )}

            <button
              onClick={() => setShowDB((v) => !v)}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            >
              {showDB ? "Back" : "History"}
            </button>
          </div>
        </div>

        {!showDB && (
          <div className="px-4 pb-3 flex gap-2">
            <TabBtn
              label="Settings"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
            />

            <TabBtn
              label="Stats"
              active={activeTab === "stats"}
              onClick={() => setActiveTab("stats")}
            />

            <TabBtn
              label="Errors"
              active={activeTab === "errors"}
              onClick={() => setActiveTab("errors")}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {showDB ? (
          <Card title="Conversation History">
            <div className="flex flex-col gap-3">
              {entries.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No saved conversations.
                </div>
              ) : (
                entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-xl p-3 bg-white"
                  >
                    <div className="text-sm">
                      <span className="font-semibold text-blue-600">You:</span>{" "}
                      {entry.You}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold text-purple-600">
                        Cust:
                      </span>{" "}
                      {entry.Customer}
                    </div>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}

              <button
                onClick={handleDeleteAll}
                className="w-full mt-2 px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200"
              >
                Delete All
              </button>
            </div>
          </Card>
        ) : activeTab === "settings" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <Card title="System Prompt">
                <textarea
                  ref={promptRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    autoGrow(e.target);
                  }}
                  placeholder="System prompt..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
                  style={{ minHeight: 360 }}
                />
              </Card>

              <Card title="Database">
                <button
                  onClick={() => {
                    if (typeof chrome !== "undefined" && chrome.tabs) {
                      chrome.tabs.create({
                        url: chrome.runtime.getURL("db-viewer.html"),
                      });
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-700 text-white font-semibold hover:bg-indigo-800"
                >
                  Open DB Viewer
                </button>
              </Card>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card title="API Keys & Model">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label>OpenAI API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={openAi}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Grok API Key</Label>
                    <Input
                      type="password"
                      placeholder="xai-..."
                      value={grokKey}
                      onChange={(e) => setGrokKey(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Model</Label>
                    <Select
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                    >
                      <optgroup label="Grok (xAI)">
                        <option value="grok-4.20-reasoning">
                          grok-4.20-reasoning
                        </option>
                        <option value="grok-4.20">grok-4.20</option>
                      </optgroup>
                      <optgroup label="GPT-5">
                        <option value="gpt-5.4">gpt-5.4</option>
                        <option value="gpt-5.3-chat-latest">gpt-5.3</option>
                        <option value="gpt-5.2">gpt-5.2</option>
                        <option value="gpt-5.1">gpt-5.1</option>

                        <option value="gpt-5-mini">gpt-5-mini</option>
                        <option value="gpt-5-nano">gpt-5-nano</option>
                      </optgroup>
                      <optgroup label="GPT 4">
                        <option value="gpt-4.1">gpt-4.1</option>
                      </optgroup>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card title="Message Length">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label>Mode</Label>
                    <Select
                      value={uiLenMode}
                      onChange={(e) => {
                        const next = e.target.value;

                        preserveScroll();
                        setUiLenMode(next);

                        if (next === "variation") {
                          setMsgVarEnabled(true);
                          setMsgLenMode("range");
                        } else {
                          setMsgVarEnabled(false);
                          setMsgLenMode(next);
                        }
                      }}
                    >
                      <option value="fixed">Fixed</option>
                      <option value="range">Range</option>
                      <option value="random">Random</option>
                      <option value="variation">Variation (Short/Long)</option>
                    </Select>

                    <div className="mt-2 text-xs font-semibold text-gray-500">
                      Preview:{" "}
                      <span className="text-gray-800">{lengthPreview}</span>
                    </div>
                  </div>

                  {uiLenMode === "fixed" && (
                    <div>
                      <Label>Characters</Label>
                      <NumericInput
                        value={msgLenFixed}
                        onValue={(n) => setMsgLenFixed(n)}
                        min={1}
                        max={5000}
                        placeholder="120"
                      />
                    </div>
                  )}

                  {(uiLenMode === "range" || uiLenMode === "random") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>From</Label>
                        <NumericInput
                          value={msgLenFrom}
                          onValue={(n) => setMsgLenFrom(n)}
                          min={1}
                          max={5000}
                          placeholder="80"
                        />
                      </div>
                      <div>
                        <Label>To</Label>
                        <NumericInput
                          value={msgLenTo}
                          onValue={(n) => setMsgLenTo(n)}
                          min={1}
                          max={5000}
                          placeholder="150"
                        />
                      </div>
                    </div>
                  )}

                  {uiLenMode === "variation" && (
                    <div className="mt-2 flex flex-col gap-3">
                      <div>
                        <Label>Strategy</Label>
                        <Select
                          value={msgVarStrategy}
                          onChange={(e) => setMsgVarStrategy(e.target.value)}
                        >
                          <option value="pattern">Pattern</option>
                          <option value="random2">Random</option>
                        </Select>
                      </div>

                      <div>
                        <Label>Pattern</Label>
                        <Input
                          value={msgVarPattern}
                          onChange={(e) => setMsgVarPattern(e.target.value)}
                          disabled={msgVarStrategy !== "pattern"}
                          placeholder="2S1L"
                          className={
                            msgVarStrategy === "pattern" && !patternCheck.ok
                              ? "border-red-400 focus:ring-red-400"
                              : ""
                          }
                        />
                        {msgVarStrategy === "pattern" && !patternCheck.ok && (
                          <div className="mt-1 text-xs font-semibold text-red-600">
                            {patternCheck.msg}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Short From</Label>
                          <NumericInput
                            value={msgShortFrom}
                            onValue={(n) => setMsgShortFrom(n)}
                            min={1}
                            max={5000}
                            placeholder="60"
                          />
                        </div>
                        <div>
                          <Label>Short To</Label>
                          <NumericInput
                            value={msgShortTo}
                            onValue={(n) => setMsgShortTo(n)}
                            min={1}
                            max={5000}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Long From</Label>
                          <NumericInput
                            value={msgLongFrom}
                            onValue={(n) => setMsgLongFrom(n)}
                            min={1}
                            max={5000}
                            placeholder="120"
                          />
                        </div>
                        <div>
                          <Label>Long To</Label>
                          <NumericInput
                            value={msgLongTo}
                            onValue={(n) => setMsgLongTo(n)}
                            min={1}
                            max={5000}
                            placeholder="180"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="History lines sent to AI">
                <div className="flex flex-col gap-2">
                  <Select
                    value={historyMaxLines}
                    onChange={(e) => {
                      const val = clampInt(e.target.value, 40, 0, 5000);
                      setHistoryMaxLines(val);
                      chromeSet({ historyMaxLines: val });
                    }}
                  >
                    <option value={0}>All (old behavior)</option>
                    <option value={20}>20</option>
                    <option value={40}>40 (recommended)</option>
                    <option value={60}>60</option>
                    <option value={80}>80</option>
                  </Select>
                  <p className="text-xs text-gray-500">
                    All = old behavior. 40 is recommended for long chats.
                    Personals still provide long-term facts.
                  </p>
                </div>
              </Card>

              <Card title="Learn Examples">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label>Normal Tags</Label>
                    <Select
                      value={learnExamplesLimit}
                      onChange={(e) => {
                        const val = clampInt(e.target.value, 30, 1, 500);
                        setLearnExamplesLimit(val);
                        chromeSet({ learnExamplesLimit: val });
                      }}
                    >
                      {[5, 10, 20, 30, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label>Trigger Tags</Label>
                    <Select
                      value={triggerLearnExamplesLimit}
                      onChange={(e) => {
                        const val = clampInt(e.target.value, 2, 1, 100);
                        setTriggerLearnExamplesLimit(val);
                        chromeSet({ triggerLearnExamplesLimit: val });
                      }}
                    >
                      {[2, 5, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : activeTab === "stats" ? (
          <div className="flex flex-col gap-4">
            <Card title="Stats">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Cost</div>
                  <div className="text-lg font-bold">
                    ${stats?.cost || "0.000000"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Model</div>
                  <div className="text-lg font-bold">{stats?.model || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Input Tokens</div>
                  <div className="text-lg font-bold">
                    {stats?.promptTokens || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Output Tokens</div>
                  <div className="text-lg font-bold">
                    {stats?.completionTokens || 0}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Total Tokens</div>
                  <div className="text-lg font-bold">
                    {stats?.totalTokens || 0}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Before / after benchmark">
              <p className="text-xs text-gray-500 mb-3">
                Generate once on a long chat, Save Before. After packing tasks,
                generate on the same kind of chat, Save After.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={saveBenchmarkBefore}
                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  Save as Before (baseline)
                </button>
                <button
                  type="button"
                  onClick={saveBenchmarkAfter}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Save as After (updated)
                </button>
                <button
                  type="button"
                  onClick={clearBenchmarkAfter}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Clear After
                </button>
                <button
                  type="button"
                  onClick={resetBenchmarkBefore}
                  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Reset Before
                </button>
              </div>

              {benchmarkBefore && benchmarkAfter ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-2 font-semibold">Metric</th>
                        <th className="py-1 pr-2 font-semibold">Before</th>
                        <th className="py-1 pr-2 font-semibold">After</th>
                        <th className="py-1 font-semibold">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: "Input tokens (API)",
                          before: benchmarkBefore.usage?.promptTokens,
                          after: benchmarkAfter.usage?.promptTokens,
                          highlight: true,
                        },
                        {
                          label: "Output tokens",
                          before: benchmarkBefore.usage?.completionTokens,
                          after: benchmarkAfter.usage?.completionTokens,
                        },
                        {
                          label: "Total tokens",
                          before: benchmarkBefore.usage?.totalTokens,
                          after: benchmarkAfter.usage?.totalTokens,
                        },
                        {
                          label: "Cost $",
                          before: benchmarkBefore.usage?.cost,
                          after: benchmarkAfter.usage?.cost,
                          money: true,
                          highlight: true,
                        },
                        {
                          label: "History lines sent",
                          before: benchmarkBefore.ledger?.historyLineCount,
                          after: benchmarkAfter.ledger?.historyLineCount,
                        },
                        {
                          label: "History chars",
                          before:
                            benchmarkBefore.ledger?.conversationHistory?.chars,
                          after:
                            benchmarkAfter.ledger?.conversationHistory?.chars,
                        },
                        {
                          label: "History approx tokens",
                          before:
                            benchmarkBefore.ledger?.conversationHistory
                              ?.approxTokens,
                          after:
                            benchmarkAfter.ledger?.conversationHistory
                              ?.approxTokens,
                        },
                        {
                          label: "Final system chars",
                          before:
                            benchmarkBefore.ledger?.finalSystemMessage?.chars,
                          after:
                            benchmarkAfter.ledger?.finalSystemMessage?.chars,
                        },
                        {
                          label: "Final system approx tokens",
                          before:
                            benchmarkBefore.ledger?.finalSystemMessage
                              ?.approxTokens,
                          after:
                            benchmarkAfter.ledger?.finalSystemMessage
                              ?.approxTokens,
                        },
                      ].map((row) => {
                        const lower = isAfterLower(row.before, row.after);
                        return (
                          <tr key={row.label} className="border-t border-gray-100">
                            <td className="py-1 pr-2 text-gray-800">
                              {row.label}
                            </td>
                            <td className="py-1 pr-2 font-mono">
                              {row.money
                                ? formatNum(row.before, 6)
                                : formatNum(row.before)}
                            </td>
                            <td className="py-1 pr-2 font-mono">
                              {row.money
                                ? formatNum(row.after, 6)
                                : formatNum(row.after)}
                            </td>
                            <td
                              className={
                                "py-1 font-mono " +
                                (row.highlight && lower
                                  ? "text-emerald-700 font-semibold"
                                  : "")
                              }
                            >
                              {formatDeltaCell(row.before, row.after, {
                                money: Boolean(row.money),
                              })}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-gray-200">
                        <td className="py-1 pr-2 text-gray-800">Saved at</td>
                        <td className="py-1 pr-2">
                          {benchmarkBefore.savedAt
                            ? new Date(
                                benchmarkBefore.savedAt,
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-1 pr-2">
                          {benchmarkAfter.savedAt
                            ? new Date(benchmarkAfter.savedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-1 text-gray-400">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {benchmarkBefore
                    ? "Before is saved. Generate again later, then Save After."
                    : "No snapshots yet. Save Before after a long-chat generation."}
                </div>
              )}
            </Card>

            <Card title="Prompt ledger (approx)">
              {promptLedger ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-2 font-semibold">Section</th>
                        <th className="py-1 pr-2 font-semibold">Chars</th>
                        <th className="py-1 font-semibold">Approx tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["system", "System prompt"],
                        ["messageLength", "Message length"],
                        ["firstMessage", "First message"],
                        ["personals", "Personals"],
                        ["genderPrompt", "Gender / grammar"],
                        ["conversationHistory", "Conversation history"],
                        ["examples", "Examples"],
                        ["suggestMsg", "Suggested flow"],
                        ["badResponses", "Bad responses"],
                        ["prevGenText", "Previous AI replies"],
                        ["datePrompt", "Time context"],
                        ["triggerPrompt", "Trigger hint"],
                        ["finalSystemMessage", "Final system (sent)"],
                      ].map(([key, label]) => {
                        const row = promptLedger[key];
                        return (
                          <tr key={key} className="border-t border-gray-100">
                            <td className="py-1 pr-2 text-gray-800">{label}</td>
                            <td className="py-1 pr-2 font-mono">
                              {row?.chars ?? 0}
                            </td>
                            <td className="py-1 font-mono">
                              {row?.approxTokens ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-gray-200">
                        <td className="py-1 pr-2 text-gray-800">
                          History lines
                        </td>
                        <td className="py-1 pr-2 font-mono" colSpan={2}>
                          {promptLedger.historyLineCount ?? 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {promptLedger.timestamp ? (
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(promptLedger.timestamp).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No ledger yet. Run Suggest or Auto once to measure the
                  prompt.
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card title="Errors">
              {lastError ? (
                <div className="border border-red-200 bg-red-50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-red-800">
                        {lastError.title}
                      </div>
                      <div className="text-xs text-red-500">
                        {new Date(lastError.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setLastError(null)}
                      className="text-xs font-semibold text-red-700 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-red-800 bg-red-100 rounded-lg p-2 break-words">
                    {lastError.details}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No errors.</div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
