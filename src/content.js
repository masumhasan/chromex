// ===== content.js (FULL REWRITE) =====
// Adds: Auto-click "OK and disconnect other tabs" when <app-multiple-tabs-modal> appears.

import { isTriggerCustomerMessage, isTriggerTag } from "./promptPacking.js";

// ----------------------------
// ✅ Optional: run only on your target sites
// ----------------------------
const __ALLOWED_HOSTS__ = new Set([
  "agents.moderationinterface.com",
  "chat.freedomgpt.com",
]);

if (!__ALLOWED_HOSTS__.has(window.location.hostname)) {
  // Avoid running on random pages since your manifest matches <all_urls>
  // returns to stop execution if not on allowed host
  // return; // Commented out to ensure it runs if you are testing on other domains, uncomment in prod.
}

// ----------------------------
// 🔥 AUTO: Multiple-tabs modal killer (Refined for your Screenshots)
// ----------------------------
(function initAutoDisconnectOtherTabs() {
  const MODAL_TAG = "app-multiple-tabs-modal";
  // The button is usually .btn.btn-outline-dark, but NOT .btn-danger
  const TARGET_BUTTON_SELECTOR = "button.btn.btn-outline-dark:not(.btn-danger)";

  console.log("🚀 Auto-Disconnect service started...");

  const attemptDisconnect = () => {
    // 1. Find the modal
    const modal = document.querySelector(MODAL_TAG);
    if (!modal) return;

    // 2. Find the specific button inside the modal
    // We strictly look for the button that is NOT the danger (logout) button
    const buttons = Array.from(modal.querySelectorAll("button"));
    const okButton = buttons.find((btn) => {
      const cls = btn.className.toLowerCase();
      const txt = (btn.textContent || "").toLowerCase();

      // Logic based on your screenshots:
      // The "Logout" button has 'btn-danger'.
      // The "OK" button does NOT have 'btn-danger'.
      // Double check text just to be safe.
      const isDanger = cls.includes("btn-danger");
      const isOkText = txt.includes("ok") || txt.includes("disconnect");

      return !isDanger && isOkText;
    });

    if (okButton) {
      // Check if visible
      const rect = okButton.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log("✅ Found 'Disconnect' button. Clicking now...");
        okButton.click();

        // Failsafe: Try dispatching a raw event if .click() is blocked by framework
        const clickEvent = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        okButton.dispatchEvent(clickEvent);
      }
    }
  };

  // A. Observer: Watch for the modal being added to DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // If the modal or a parent of the modal was added
        const hasModal = document.querySelector(MODAL_TAG);
        if (hasModal) {
          attemptDisconnect();
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // B. Interval: Failsafe check every 1 second (in case Observer misses it or it renders slowly)
  setInterval(attemptDisconnect, 1000);

  // C. Visibility: Check immediately when user tabs back into the window
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) attemptDisconnect();
  });
})();

// ----------------------------
// Existing AI automation logic
// ----------------------------
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

let idItems = { textBox: "chat-windows-message-textarea" };

let classItems = {
  mainCard: "card-body",
  userMessage: "li.ng-star-inserted .timeline-body",
  agentMessage: "li.timeline-inverted.ng-star-inserted .timeline-body",
  loading: ".loading-text",
};

let mode = 2; // 1: Learn, 2: Suggest, 3: Auto
let AiInsert = false;
let dataGrabbed = false;

// ✅ Accept “correct” block even if values are blank, as long as labels exist
function looksLikePersonalBlock(text) {
  const t = (typeof text === "string" ? text : "").trim();
  if (!t) return false;

  const req = ["Name:", "Age:", "City:", "Job:", "Sex preference:", "Others:"];
  const lower = t.toLowerCase();
  const hasAll = req.every((r) => lower.includes(r.toLowerCase()));
  if (hasAll) return true;

  // fallback: any non-empty value after ":"
  return t.split("\n").some((l) => {
    const idx = l.indexOf(":");
    if (idx === -1) return false;
    return l.slice(idx + 1).trim().length > 0;
  });
}

function isExtensionValid() {
  try {
    return Boolean(
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id,
    );
  } catch {
    return false;
  }
}

function safeSendMessage(payload) {
  if (!isExtensionValid()) return;
  try {
    chrome.runtime.sendMessage(payload, () => {
      if (chrome.runtime?.lastError) {
        // Silently ignore context invalidation error
      }
    });
  } catch {
    // Ignore invalidated context
  }
}

function setInputValueSafe(el, text) {
  if (!el) return;
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

let pendingActionTimer = null;
function clearPendingTimer() {
  if (pendingActionTimer) {
    clearTimeout(pendingActionTimer);
    pendingActionTimer = null;
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (!isExtensionValid()) return;
  try {
    if (message.type === "suggestionResponse") {
      clearPendingTimer();
      removeBanner();
      if (mode !== 2) return;

      const textBox = document.getElementById(idItems.textBox);
      const mainCard = textBox?.closest("." + classItems.mainCard);
      if (!mainCard) return;

      let suggestionCard = document.getElementById("ai-suggestion-card");
      let suggestionText = "";

      if (message?.payload?.success) {
        suggestionText = (message.payload?.message || "").trim();
      }

      if (!suggestionCard) {
        suggestionCard = document.createElement("div");
        suggestionCard.id = "ai-suggestion-card";
        suggestionCard.style.cssText = `
          width: 100%;
          background: #f5f5f5;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 6px;
          font-family: monospace;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          max-height: 140px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        `;

        const modeButtons = document.getElementById("mode-switcher");
        if (modeButtons) mainCard.insertBefore(suggestionCard, modeButtons);
        else mainCard.appendChild(suggestionCard);
      }

      if (!message?.payload?.success) {
        suggestionCard.innerHTML = `
          <div style="color: #c00; font-weight: bold; margin-bottom: 4px;">⚠️ Suggestion Error:</div>
          <div style="color: #333;">${escapeHtml(message?.payload?.error || "Failed to get suggestion from AI.")}</div>
        `;
        suggestionCard.style.background = "#fff0f0";
        suggestionCard.style.borderColor = "#f5c6cb";
      } else {
        suggestionCard.style.background = "#f5f5f5";
        suggestionCard.style.borderColor = "#ccc";
        await pushToBoundedArray("lastAISuggestion", suggestionText, 10);

        let suggestArr = (await getArrayFromChromeStorage("suggestions")) || [];
        if (!suggestArr.includes(suggestionText)) {
          if (suggestArr.length >= 10) suggestArr.shift();
          suggestArr.push(suggestionText);
        }

        suggestionCard.innerHTML = `
          <b>💬Suggested reply:</b>
          <p>${escapeHtml(suggestionText)}</p>
          <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
            <button id="insert-suggestion-btn" style="
              width: 120px;height: 32px;padding: 2px 8px;font-size: 13px;
              background-color: #4CAF50;color: white;border: none;border-radius: 6px;cursor: pointer;">
              Insert Text
            </button>
            <button id="insert-send-suggestion-btn" style="
              width: 120px;height: 32px;padding: 2px 8px;font-size: 13px;
              background-color: #2196F3;color: white;border: none;border-radius: 6px;cursor: pointer;">
              Insert & Send
            </button>
          </div>
        `;

        document
          .getElementById("insert-suggestion-btn")
          ?.addEventListener("click", () => insertSuggestionText(suggestionText));

        document
          .getElementById("insert-send-suggestion-btn")
          ?.addEventListener("click", () =>
            insertAndSendSuggestion(suggestionText)
          );
      }
    }

    if (message.type === "autoResponse") {
      clearPendingTimer();
      removeBanner();
      if (mode !== 3) return;

      if (!message?.payload?.success) {
        showBanner(
          message?.payload?.error || "❌ Failed to get suggestion from AI."
        );
        await new Promise((r) => setTimeout(r, 4000));
        removeBanner();
        return;
      }

      const responseText = (message?.payload?.message || "").trim();
      if (!responseText) return console.warn("⚠️ Empty AI response payload.");

      await pushToBoundedArray("lastAISuggestion", responseText, 10);

      const textBox = document.getElementById(idItems.textBox);
      if (!textBox) return console.error("❌ Textbox not found.");

      if (responseText.length < 70 && !(await skipShortRegenerate())) {
        showBanner("⚠️ Response too short Regenerating...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        removeBanner();
        await autoMode();
        return;
      }

      let sendButton = document.querySelector('button[type="submit"]');
      if (!sendButton) return console.error("❌ Send button not found.");

      textBox.focus();
      document.execCommand("insertText", false, responseText);
      textBox.value = responseText;
      textBox.dispatchEvent(new Event("input", { bubbles: true }));
      textBox.dispatchEvent(new Event("change", { bubbles: true }));
      textBox.focus();

      sendButton?.removeAttribute("disabled");
      for (let i = 0; i < 10; i++) {
        showBanner("Waiting time: " + (10 - i) + " seconds...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        removeBanner();
      }
      sendButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // ✅ personalsResponse: only update boxes if the formatted block is valid
    if (message.type === "personalsResponse") {
      const p = message?.payload || {};
      if (!p.success) {
        console.warn("❌ personalsResponse failed:", p.error);
        return;
      }

      const custEl = document.getElementById("customer-custom");
      const modEl = document.getElementById("moderator-custom");

      const newCust =
        typeof p.customerPersonal === "string" ? p.customerPersonal.trim() : "";
      const newMod =
        typeof p.moderatorPersonal === "string" ? p.moderatorPersonal.trim() : "";

      if (custEl && looksLikePersonalBlock(newCust))
        setInputValueSafe(custEl, newCust);
      if (modEl && looksLikePersonalBlock(newMod))
        setInputValueSafe(modEl, newMod);

      const finalCust = custEl?.value?.trim() || "";
      const finalMod = modEl?.value?.trim() || "";
      await setToChromeStorage("customerPersonal", finalCust);
      await setToChromeStorage("moderatorPersonal", finalMod);
      await setToChromeStorage(
        "personals",
        `You: ${finalMod}, customer${finalCust}`
      );

      if (typeof p.tag === "string" && p.tag.trim()) {
        const tag = p.tag.trim();
        await setToChromeStorage("selectedTag", tag);
        const tagSelect = document.getElementById("learn-tag-select");
        if (tagSelect) tagSelect.value = tag;
      }
    }
  } catch {
    // Silently ignore invalidated context errors
  }
});

async function insertSuggestionText(text) {
  AiInsert = true;

  if (text.length < 75 && !(await skipShortRegenerate())) {
    showBanner("⚠️ Response too short Regenerating...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    removeBanner();
    await suggestMode();
    return;
  }

  const textBox = document.getElementById(idItems.textBox);
  if (!textBox) return;

  textBox.focus();
  textBox.value = text;

  await new Promise((resolve) => setTimeout(resolve, 1000));
  cleanupAndExecute();
}

async function insertAndSendSuggestion(text) {
  AiInsert = true;

  let sendButton = document.querySelector('button[type="submit"]');
  if (text.length < 75 && !(await skipShortRegenerate())) {
    showBanner("⚠️ Response too short Regenerating...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    removeBanner();
    await suggestMode();
    return;
  }

  const textBox = document.getElementById(idItems.textBox);
  if (!textBox) return;

  textBox.focus();
  document.execCommand("insertText", false, text);
  textBox.dispatchEvent(new Event("input", { bubbles: true }));
  textBox.dispatchEvent(new Event("change", { bubbles: true }));
  textBox.focus();

  textBox.value = text;
  sendButton?.removeAttribute("disabled");

  await learn2(text);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  cleanupAndExecute();
}

function showBanner(text = "Working...") {
  removeBanner();
  const banner = document.createElement("div");
  banner.id = "process-banner";
  banner.textContent = text;
  banner.style.cssText = `
    position: fixed; top: 10px; left: 50%;
    transform: translateX(-50%);
    background-color: #007bff; color: white;
    padding: 8px 16px; border-radius: 5px;
    font-weight: bold; z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(banner);
}

function removeBanner() {
  const banner = document.getElementById("process-banner");
  if (banner) banner.remove();
}

function findTextBox() {
  return (
    document.getElementById(idItems.textBox) ||
    document.querySelector("textarea#chat-windows-message-textarea")
  );
}

function findComposerRoot(textBox) {
  if (!textBox) return null;
  return (
    textBox.closest("." + classItems.mainCard) ||
    textBox.closest(".card") ||
    textBox.closest("form") ||
    textBox.parentElement
  );
}

async function mountOverlay(textBox) {
  const mainCard = findComposerRoot(textBox);
  if (!mainCard) return false;

  ensureStylesOnce();

  if (!document.getElementById("mode-switcher")) {
    const modeSwitcher = document.createElement("div");
    modeSwitcher.id = "mode-switcher";
    modeSwitcher.style.marginTop = "10px";
    modeSwitcher.style.display = "flex";
    modeSwitcher.style.alignItems = "center";
    modeSwitcher.style.gap = "6px";
    modeSwitcher.style.flexWrap = "wrap";

    const learnBtn = document.createElement("button");
    learnBtn.id = "mode-learn";
    learnBtn.textContent = "Learn";
    learnBtn.className = "mode-btn active";

    const tagSelect = document.createElement("select");
    tagSelect.id = "learn-tag-select";
    tagSelect.className = "tag-select";

    TAGS.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagSelect.appendChild(opt);
    });

    const saved = await getFromChromeStorage("selectedTag");
    const initialTag = TAGS.includes(saved) ? saved : DEFAULT_TAG;
    tagSelect.value = initialTag;
    await setToChromeStorage("selectedTag", initialTag);

    tagSelect.addEventListener("change", async (e) => {
      await setToChromeStorage("selectedTag", e.target.value);
    });

    const suggestBtn = document.createElement("button");
    suggestBtn.id = "mode-suggest";
    suggestBtn.textContent = "Suggest";
    suggestBtn.className = "mode-btn";

    const autoBtn = document.createElement("button");
    autoBtn.id = "mode-auto";
    autoBtn.textContent = "Auto";
    autoBtn.className = "mode-btn";

    modeSwitcher.appendChild(learnBtn);
    modeSwitcher.appendChild(tagSelect);
    modeSwitcher.appendChild(suggestBtn);
    modeSwitcher.appendChild(autoBtn);
    mainCard.appendChild(modeSwitcher);

    if (mode === 2) suggestBtn.classList.add("active");
    if (mode === 3) autoBtn.classList.add("active");

    const buttons = { 2: suggestBtn, 3: autoBtn };
    Object.entries(buttons).forEach(([key, btn]) => {
      btn.addEventListener("click", () => {
        Object.values(buttons).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        mode = parseInt(key);
        if (mode === 2) suggestMode();
        if (mode === 3) autoMode();
      });
    });

    learnBtn.addEventListener("click", () => learnMode());
  }

  if (!document.getElementById("manual-suggestion-wrapper")) {
    createManualSuggestionUI(mainCard);
  }

  return true;
}

let executeInFlight = false;

async function executeScript() {
  if (executeInFlight) return;
  executeInFlight = true;
  dataGrabbed = false;

  try {
    let textBox;
    while (!textBox) {
      textBox = findTextBox();
      await new Promise((r) => setTimeout(r, 500));
    }

    while (textBox?.disabled) {
      await new Promise((r) => setTimeout(r, 500));
      textBox = findTextBox();
    }

    AiInsert = false;
    await mountOverlay(textBox);

    showBanner("Collecting messages, please wait...");
    try {
      await grabData(6);
    } catch (err) {
      console.error("❌ grabData failed (overlay still shown):", err);
    }
    removeBanner();
    await new Promise((r) => setTimeout(r, 600));

    if (!document.getElementById("mode-switcher")) {
      await mountOverlay(findTextBox());
    }

    if (mode === 2) suggestMode();
    else if (mode === 3) autoMode();
  } finally {
    executeInFlight = false;
  }
}

async function autoMode() {
  showBanner("AI is auto-filling, please wait...");
  clearPendingTimer();
  pendingActionTimer = setTimeout(() => {
    removeBanner();
    showBanner("⏱️ Auto-fill timed out. Please try again.");
    setTimeout(() => removeBanner(), 4000);
  }, 30000);

  if (dataGrabbed === false) await grabData(4);
  safeSendMessage({ type: "autoFill" });
}

async function suggestMode() {
  showBanner("Please wait, getting suggestion...");
  clearPendingTimer();
  pendingActionTimer = setTimeout(() => {
    removeBanner();
    const textBox = document.getElementById(idItems.textBox);
    const mainCard = textBox?.closest("." + classItems.mainCard);
    if (!mainCard) return;
    let card = document.getElementById("ai-suggestion-card");
    if (!card) {
      card = document.createElement("div");
      card.id = "ai-suggestion-card";
      card.style.cssText = `
        width: 100%;
        background: #fff0f0;
        border: 1px solid #f5c6cb;
        border-radius: 6px;
        padding: 6px;
        font-family: monospace;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        max-height: 140px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      `;
      const modeButtons = document.getElementById("mode-switcher");
      if (modeButtons) mainCard.insertBefore(card, modeButtons);
      else mainCard.appendChild(card);
    }
    card.innerHTML = `
      <div style="color: #c00; font-weight: bold; margin-bottom: 4px;">⚠️ Request Timed Out</div>
      <div style="color: #333;">The extension background service took too long to reply. Check your OpenAI API key in Popup Settings and try again.</div>
    `;
    card.style.background = "#fff0f0";
    card.style.borderColor = "#f5c6cb";
  }, 30000);

  if (dataGrabbed === false) await grabData(4);
  safeSendMessage({ type: "getSuggestion" });
}

async function learnMode() {
  await learn2();
  const textBox = document.getElementById(idItems.textBox);
  if (!textBox) return;

  const text = textBox.value.trim();
  if (!text || text.length < 3) return;

  try {
    const selectedTag =
      document.getElementById("learn-tag-select")?.value ||
      (await getFromChromeStorage("selectedTag")) ||
      DEFAULT_TAG;

    const existingMessages = await getArrayFromChromeStorage("training");

    const migrated = (Array.isArray(existingMessages) ? existingMessages : [])
      .map((item) => {
        if (typeof item === "string")
          return { message: item, tag: selectedTag };
        if (item && typeof item === "object") {
          const msg = item.message ?? item.messages;
          const tag = item.tag ?? selectedTag;
          if (typeof msg !== "string" || !msg.trim()) return null;
          return { message: msg, tag };
        }
        return null;
      })
      .filter(Boolean);

    const already = migrated.some(
      (x) => x.message === text && String(x.tag) === String(selectedTag)
    );
    if (already) return;

    const next = migrated.concat([{ message: text, tag: selectedTag }]);
    while (next.length > 1000) next.shift();
    storeArrayToChromeStorage("training", next);
    cleanupAndExecute();
  } catch (err) {
    console.error("❌ Failed to update messages:", err);
  }
}

async function learn2(text = null) {
  let userText = "";
  if (!text) {
    const textBox = document.getElementById(idItems.textBox);
    if (!textBox) return;
    userText = textBox.value.trim();
    if (!userText || userText.length < 3) return;
  } else userText = text;

  const currentMessage = await getArrayFromChromeStorage("currentMessage");
  const latestUserMsg = currentMessage?.[0]?.content?.trim();
  if (!latestUserMsg) return;

  try {
    const now = new Date();
    safeSendMessage({
      type: "storeConversations",
      data: { You: userText, Customer: latestUserMsg, date: now.toISOString() },
    });
  } catch (err) {
    console.error("❌ Failed to save to IDB:", err);
  }
}

function extractTimelineTimestamp(headingText) {
  if (!headingText) return 0;
  const clean = headingText.replace(/#[0-9]+/g, "").replace(/by another agent.*/i, "").trim();
  const match = clean.match(/(\d{1,4}[-./]\d{1,2}[-./]\d{1,4}(?:[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)?)/);
  if (match) {
    const ts = Date.parse(match[1]);
    if (!isNaN(ts)) return ts;
  }
  const directTs = Date.parse(clean);
  if (!isNaN(directTs)) return directTs;
  return 0;
}

async function grabData(limit = 4) {
  let previousHeight = 0;

  for (let i = 0; i < limit; i++) {
    const currentHeight = document.body.scrollHeight;
    if (i > 0 && currentHeight === previousHeight) break;
    previousHeight = currentHeight;
    window.scrollTo({ top: currentHeight, behavior: "smooth" });

    let waited = 0;
    while (
      document.querySelector(".alert.alert-info.text-center") &&
      waited < 3000
    ) {
      await new Promise((r) => setTimeout(r, 200));
      waited += 200;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  window.scrollTo({ top: 0 });

  const timelineItems = document.querySelectorAll("li.ng-star-inserted");
  const parsedItems = [];

  timelineItems.forEach((li) => {
    const body = li.querySelector(".timeline-body");
    if (!body) return;

    const text = body.innerText?.trim();
    if (!text) return;

    const heading = (li.querySelector(".timeline-heading")?.innerText || "").trim();
    const isAgent = li.classList.contains("timeline-inverted");

    parsedItems.push({
      role: isAgent ? "You" : "Customer",
      text,
      heading,
      timestamp: extractTimelineTimestamp(heading),
    });
  });

  // Determine chronological direction (newest-first vs oldest-first)
  const itemsWithTs = parsedItems.filter((p) => p.timestamp > 0);
  let isNewestFirst = true; // Default for agents.moderationinterface.com (composer at top)
  if (itemsWithTs.length >= 2) {
    const firstTs = itemsWithTs[0].timestamp;
    const lastTs = itemsWithTs[itemsWithTs.length - 1].timestamp;
    if (firstTs !== lastTs) {
      isNewestFirst = firstTs > lastTs;
    }
  }

  let latestUser = "";
  let latestMessageDate = "";
  let chronologicalItems = [];

  if (isNewestFirst) {
    // Newest is at the top of the DOM (e.g. agents.moderationinterface.com)
    const latestCustomerItem = parsedItems.find((p) => p.role === "Customer");
    latestUser = latestCustomerItem?.text || "";
    latestMessageDate = itemsWithTs[0]?.heading || parsedItems[0]?.heading || "";
    chronologicalItems = parsedItems.slice().reverse();
  } else {
    // Oldest is at top, newest at bottom
    const latestCustomerItem = parsedItems.slice().reverse().find((p) => p.role === "Customer");
    latestUser = latestCustomerItem?.text || "";
    latestMessageDate = itemsWithTs[itemsWithTs.length - 1]?.heading || parsedItems[parsedItems.length - 1]?.heading || "";
    chronologicalItems = parsedItems.slice();
  }

  const data = chronologicalItems.map((p) => `${p.role}: ${p.text}`);
  const currentMessage = [
    {
      role: "user",
      content: latestUser || "",
    },
  ];

  await setToChromeStorage("latestMessageDate", latestMessageDate);
  await setToChromeStorage("botNow", new Date().toString());

  // data2 is passed to processPersonals — do NOT push latestUser twice
  const data2 = data.slice();

  const customerPersonal =
    document.getElementById("customer-custom")?.value || "";
  const moderatorPersonal =
    document.getElementById("moderator-custom")?.value || "";
  const conversationStart =
    document.querySelector(
      ".badge.badge-primary.float-right.ng-star-inserted",
    )?.innerText || "";
  await setToChromeStorage("customerPersonal", customerPersonal.trim());
  await setToChromeStorage("moderatorPersonal", moderatorPersonal.trim());
  await setToChromeStorage("conversationStart", conversationStart.trim());
  await setToChromeStorage(
    "personals",
    `You: ${moderatorPersonal.trim()}, customer${customerPersonal.trim()}`
  );

  await safeSendMessage({
    type: "processPersonals",
    data: { customerPersonal, moderatorPersonal },
    conversationHistory: data2,
  });

  storeArrayToChromeStorage("messages", data);
  storeArrayToChromeStorage("currentMessage", currentMessage);
  dataGrabbed = true;
}

function storeArrayToChromeStorage(key, array) {
  if (!isExtensionValid() || !Array.isArray(array)) return;
  try {
    chrome.storage.local.set({ [key]: array }, () => {
      if (chrome.runtime?.lastError) {
        // Silently ignore context invalidation error
      }
    });
  } catch {
    // Context invalidated
  }
}

function getArrayFromChromeStorage(key) {
  return new Promise((resolve) => {
    if (!isExtensionValid()) return resolve([]);
    try {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) return resolve([]);
        const val = result?.[key];
        resolve(Array.isArray(val) ? val : []);
      });
    } catch {
      resolve([]);
    }
  });
}

function getFromChromeStorage(key) {
  return new Promise((resolve) => {
    if (!isExtensionValid()) return resolve(undefined);
    try {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) return resolve(undefined);
        resolve(result?.[key]);
      });
    } catch {
      resolve(undefined);
    }
  });
}

async function skipShortRegenerate() {
  try {
    const tag = await getFromChromeStorage("selectedTag");
    if (isTriggerTag(tag)) return true;
    const cur = await getArrayFromChromeStorage("currentMessage");
    const latest = cur?.[0]?.content || "";
    return isTriggerCustomerMessage(latest);
  } catch {
    return false;
  }
}

function setToChromeStorage(key, value) {
  return new Promise((resolve) => {
    if (!isExtensionValid()) return resolve(false);
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) return resolve(false);
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function pushToBoundedArray(key, value, limit = 120) {
  let arr = await getArrayFromChromeStorage(key);
  if (!Array.isArray(arr)) arr = [];
  if (arr.includes(value)) return arr.length;
  while (arr.length >= limit) arr.shift();
  arr.push(value);
  storeArrayToChromeStorage(key, arr);
  return arr.length;
}

const observeSendButton = () => {
  const sendBtn = document.querySelector('button[type="submit"]');
  if (!sendBtn) {
    setTimeout(observeSendButton, 500);
    return;
  }

  sendBtn.addEventListener("click", async () => {
    await learn2();

    let loader = document.querySelector(classItems.loading);
    let cout = 0;
    while (!loader && cout < 10) {
      loader = document.querySelector(classItems.loading);
      await new Promise((r) => setTimeout(r, 500));
      cout++;
    }
    if (!loader) return;

    removeElementById("ai-suggestion-card");
    removeElementById("mode-switcher");
    removeElementById("manual-suggestion-wrapper");

    storeArrayToChromeStorage("suggestions", []);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    executeScript();
  });
};

async function cleanupAndExecute() {
  let loader = document.querySelector(classItems.loading);
  let cout = 0;

  while (!loader && cout < 10) {
    loader = document.querySelector(classItems.loading);
    await new Promise((r) => setTimeout(r, 500));
    cout++;
  }
  if (!loader) return;

  removeElementById("ai-suggestion-card");
  removeElementById("mode-switcher");
  removeElementById("manual-suggestion-wrapper");

  await new Promise((resolve) => setTimeout(resolve, 1000));
  storeArrayToChromeStorage("suggestions", []);
  executeScript();
}

function createManualSuggestionUI(mainCard) {
  const wrap = document.createElement("div");
  wrap.id = "manual-suggestion-wrapper";
  wrap.style.cssText = `display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;`;

  const input = document.createElement("input");
  input.id = "manual-suggestion-input";
  input.type = "text";
  input.placeholder = "Type a suggested message…";
  input.style.cssText = `flex:1;min-width:220px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;`;

  getFromChromeStorage("suggestion").then((val) => {
    if (typeof val === "string") input.value = val;
  });

  input.addEventListener("input", async (e) => {
    await setToChromeStorage("suggestion", e.target.value ?? "");
  });

  const btnAdd = document.createElement("button");
  btnAdd.textContent = "+ Add";
  btnAdd.style.cssText = `padding:8px 12px;background:#6c5ce7;color:#fff;border:none;border-radius:6px;cursor:pointer;`;

  btnAdd.addEventListener("click", async () => {
    const typed = input.value?.trim();
    if (!typed) return;

    const cur = await getArrayFromChromeStorage("currentMessage");
    const latest = cur?.[0]?.content?.trim() || "";
    if (!latest) return;

    const pair = `You: ${typed}, Customer: ${latest}`;
    await pushToBoundedArray("suggestions", pair, 10);
  });

  const btnReport = document.createElement("button");
  btnReport.textContent = "🚩 Report Bad suggestion";
  btnReport.style.cssText = `padding:8px 12px;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer;`;

  btnReport.addEventListener("click", async () => {
    const lastAI = (await getFromChromeStorage("lastAISuggestion"))?.[0] || "";
    const cur = await getArrayFromChromeStorage("currentMessage");
    const latest = cur?.[0]?.content?.trim() || "";
    const textBox = document?.getElementById(idItems.textBox);
    if (!textBox || !textBox?.value) return;

    const msg = `Customer Message: ${latest}\n Bad Response:${lastAI},Good Response:${textBox.value} `;
    await pushToBoundedArray("badResponses", msg, 10);
  });

  wrap.appendChild(input);
  wrap.appendChild(btnAdd);
  wrap.appendChild(btnReport);

  const modeSwitcher = document.getElementById("mode-switcher");
  if (modeSwitcher?.parentElement) {
    modeSwitcher.parentElement.insertBefore(wrap, modeSwitcher.nextSibling);
  } else {
    mainCard.appendChild(wrap);
  }
}

function ensureStylesOnce() {
  if (document.getElementById("mode-style-tag")) return;
  const style = document.createElement("style");
  style.id = "mode-style-tag";
  style.textContent = `
    .mode-btn { margin-right: 5px; color: white; border: none; padding: 5px 10px;
      border-radius: 4px; opacity: 0.6; cursor: pointer; }
    .mode-btn.active { opacity: 1; box-shadow: 0 0 6px rgba(0,0,0,0.4); }
    #mode-suggest, #mode-auto { background: #000; }
    #mode-learn { background: #6cf542; }
    .tag-select { height: 28px; border: 1px solid #ccc; border-radius: 6px;
      padding: 0 8px; font-size: 12px; background: #fff; }
  `;
  document.head.appendChild(style);
}

function removeElementById(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function watchComposerForOverlay() {
  const tryMount = () => {
    if (document.getElementById("mode-switcher")) return;
    if (!findTextBox()) return;
    executeScript();
  };

  if (!document.body) return;
  new MutationObserver(tryMount).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// kickoff
observeSendButton();
watchComposerForOverlay();
executeScript();
