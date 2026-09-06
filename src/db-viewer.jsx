import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

// ✅ suggestions removed from viewer (still exists in storage, just not shown here)
const CATEGORIES = ["training", "badResponses", "messages"];

// ✅ must match your allowed tag list
const TAGS = [
  "flirty",
  "soft",
  "question",
  "Erotic",
  "flirty and soft",
  "flirty and question",
  "flirty and erotic",
  "soft and question",
  "Soft and erotic",
  "Question and erotic",
  "(trigger) Leere Nachricht",
  "(trigger) [kiss]",
  "(trigger) [heart]",
  "(trigger) [Klaps]",
  "(trigger) Please reactivate the user!",
];
const DEFAULT_TAG = TAGS[0];

// -----------------------------
// Helpers: chrome.storage.local
// -----------------------------
function setToStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve(true));
  });
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clampTag(tag) {
  if (typeof tag !== "string") return DEFAULT_TAG;
  const t = tag.trim();
  return TAGS.includes(t) ? t : DEFAULT_TAG;
}

/**
 * ✅ Normalize training items to EXACTLY:
 * { message: string, tag: one-of TAGS }
 *
 * Also supports old formats for safety:
 * - string -> {message: string, tag: DEFAULT_TAG}
 * - {message, tags} -> tag pulled from tags (compat)
 */
function normalizeTrainingItem(item) {
  // old: strings
  if (typeof item === "string") {
    const msg = item.trim();
    if (!msg) return null;
    return { message: msg, tag: DEFAULT_TAG };
  }

  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const message = (item.message ?? "").toString().trim();
  if (!message) return null;

  const tagRaw = item.tag ?? item.tags ?? DEFAULT_TAG; // prefer tag; compat with tags
  const tag = clampTag(String(tagRaw));

  return { message, tag };
}

export default function DBViewer() {
  const fileRef = useRef(null);

  const [active, setActive] = useState("training");
  const [data, setData] = useState({
    training: [],
    badResponses: [],
    messages: [],
  });

  // Import behavior (training only)
  const [importMode, setImportMode] = useState("append"); // append | replace

  // Add training row
  const [trainMessage, setTrainMessage] = useState("");
  const [trainTag, setTrainTag] = useState(DEFAULT_TAG);

  const activeArray = useMemo(
    () => normalizeArray(data[active]),
    [data, active]
  );

  const reload = async () => {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(CATEGORIES, (res) => resolve(res || {}));
    });

    setData({
      training: normalizeArray(stored.training),
      badResponses: normalizeArray(stored.badResponses),
      messages: normalizeArray(stored.messages),
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const persistCategory = async (key, nextArr) => {
    await setToStorage(key, nextArr);
    setData((prev) => ({ ...prev, [key]: nextArr }));
  };

  const removeRow = async (idx) => {
    const next = activeArray.slice();
    next.splice(idx, 1);
    await persistCategory(active, next);
  };

  // ✅ Add training row (stores {message, tag})
  const addTrainingRow = async () => {
    const msg = trainMessage.trim();
    if (!msg) return;

    const nextItem = { message: msg, tag: clampTag(trainTag) };

    const existing = normalizeArray(data.training)
      .map(normalizeTrainingItem)
      .filter(Boolean);

    const already = existing.some(
      (x) => x.message === nextItem.message && x.tag === nextItem.tag
    );
    if (already) return;

    const next = normalizeArray(data.training).concat([nextItem]);
    await persistCategory("training", next);

    setTrainMessage("");
  };

  // -----------------------------
  // ✅ JSON Export (TRAINING ONLY)
  // -----------------------------
  const exportTrainingJSON = () => {
    const normalized = normalizeArray(data.training)
      .map(normalizeTrainingItem)
      .filter(Boolean);

    const json = JSON.stringify(normalized, null, 2);
    downloadBlob(
      "training.json",
      new Blob([json], { type: "application/json;charset=utf-8" })
    );
  };

  // -----------------------------
  // ✅ JSON Import (TRAINING ONLY)
  // -----------------------------
  const openImport = () => fileRef.current?.click();

  const importFile = async (file) => {
    if (!file) return;

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext !== "json") {
      alert("Only .json is supported for training import.");
      return;
    }

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      alert("Invalid JSON file.");
      return;
    }

    if (!Array.isArray(parsed)) {
      alert("Training JSON must be an array of {message, tag} objects.");
      return;
    }

    const incoming = parsed.map(normalizeTrainingItem).filter(Boolean);

    const current = normalizeArray(data.training)
      .map(normalizeTrainingItem)
      .filter(Boolean);

    const next = importMode === "replace" ? incoming : current.concat(incoming);

    // Store exactly in required format {message, tag}
    await persistCategory("training", next);
    setActive("training");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".json"
        onChange={(e) => importFile(e.target.files?.[0])}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">📦 Extension DB Viewer</h1>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={reload}
            className="px-3 py-2 rounded bg-white border"
          >
            Reload
          </button>

          {/* ✅ ONLY training import/export */}
          <button
            onClick={openImport}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Import Training JSON
          </button>

          <button
            onClick={exportTrainingJSON}
            className="px-3 py-2 rounded bg-emerald-600 text-white"
          >
            Export Training JSON
          </button>
        </div>
      </div>

      <div className="mt-5 bg-white border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold">Category</label>
          <select
            className="border rounded px-2 py-2"
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            {CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label className="text-sm font-semibold ml-0 sm:ml-4">
            Import mode
          </label>
          <select
            className="border rounded px-2 py-2"
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
          >
            <option value="append">Append</option>
            <option value="replace">Replace</option>
          </select>

          <p className="text-xs text-gray-500">
            Suggestions are hidden here. Only training supports JSON
            import/export.
          </p>
        </div>

        {/* Training add UI */}
        {active === "training" && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">
                Training Message
              </label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={3}
                placeholder="Message..."
                value={trainMessage}
                onChange={(e) => setTrainMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  Tag
                </label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm"
                  value={trainTag}
                  onChange={(e) => setTrainTag(e.target.value)}
                >
                  {TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={addTrainingRow}
                className="px-4 py-2 rounded bg-gray-900 text-white"
              >
                Add Training Row
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-5 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 w-16">#</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2 w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeArray.map((val, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2 align-top">{idx}</td>
                  <td className="p-2 whitespace-pre-wrap align-top">
                    {typeof val === "string"
                      ? val
                      : JSON.stringify(val, null, 2)}
                  </td>
                  <td className="p-2 align-top">
                    <button
                      onClick={() => removeRow(idx)}
                      className="px-2 py-1 rounded bg-red-600 text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {activeArray.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={3}>
                    No data in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Training JSON format: {"{ message: string, tag: one-of TAGS }"}
        </p>
      </div>
    </div>
  );
}
