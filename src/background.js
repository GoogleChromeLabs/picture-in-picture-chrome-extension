// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let lastClickTime = 0;
let lastActiveTab = null;
const DOUBLE_CLICK_DELAY = 400;

function rememberTab(tab) {
  if (!tab || !tab.id || !tab.windowId) return;
  lastActiveTab = { tabId: tab.id, windowId: tab.windowId };
  chrome.storage.local.set({ lastActiveTab });
}

function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeTextColor({ color: "#fff" });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1400);
}

async function getTargetTab(commandTab) {
  if (commandTab && commandTab.id) {
    rememberTab(commandTab);
    return commandTab;
  }

  if (lastActiveTab && lastActiveTab.tabId) {
    try {
      const tab = await chrome.tabs.get(lastActiveTab.tabId);
      if (tab && tab.id) return tab;
    } catch (_) {
      lastActiveTab = null;
    }
  }

  const stored = await chrome.storage.local.get({ lastActiveTab: null });
  if (stored.lastActiveTab && stored.lastActiveTab.tabId) {
    try {
      const tab = await chrome.tabs.get(stored.lastActiveTab.tabId);
      if (tab && tab.id) {
        rememberTab(tab);
        return tab;
      }
    } catch (_) {}
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.id) {
    rememberTab(tab);
    return tab;
  }
  return null;
}

function injectAutoPip(tabId, callback) {
  chrome.scripting.executeScript(
    { target: { tabId, allFrames: true }, files: ["autoPip.js"] },
    () => {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError.message);
        return;
      }
      callback(null);
    }
  );
}

function sendToggleBrowserPip(tabId, source, retried = false) {
  chrome.tabs.sendMessage(tabId, { type: "toggleBrowserPip", source }, (response) => {
    if (chrome.runtime.lastError) {
      if (!retried) {
        injectAutoPip(tabId, (injectError) => {
          if (injectError) {
            console.log("[PiP] Content script inject failed:", injectError);
            flashBadge("ERR", "#d93025");
            return;
          }
          sendToggleBrowserPip(tabId, source, true);
        });
        return;
      }

      console.log("[PiP] Toggle message failed:", chrome.runtime.lastError.message);
      flashBadge("ERR", "#d93025");
      return;
    }

    if (response && response.ok === false) {
      console.log("[PiP] Toggle failed:", response.error);
      flashBadge("ERR", "#d93025");
      return;
    }

    flashBadge(response && response.action === "closed" ? "OFF" : "PiP", "#188038");
  });
}

function injectAutoPipIntoMatchingOpenTabs(sites) {
  const seen = new Set();
  for (const url of sites) {
    chrome.tabs.query({ url }, (tabs) => {
      if (chrome.runtime.lastError) return;
      for (const tab of tabs || []) {
        if (!tab || !tab.id || seen.has(tab.id)) continue;
        seen.add(tab.id);
        injectAutoPip(tab.id, () => {});
      }
    });
  }
}

async function toggleBrowserPip(commandTab, source) {
  const tab = await getTargetTab(commandTab);
  if (!tab || !tab.id) {
    flashBadge("ERR", "#d93025");
    return;
  }
  sendToggleBrowserPip(tab.id, source);
}

// Shared Document PiP size for autoPip.js custom player.
let _pipW = 0;
let _pipH = 0;
let _pipX = null;
let _pipY = null;

chrome.storage.local.get({ pipSizeW: 0, pipSizeH: 0, pipSizeX: null, pipSizeY: null }, (s) => {
  _pipW = s.pipSizeW;
  _pipH = s.pipSizeH;
  _pipX = s.pipSizeX;
  _pipY = s.pipSizeY;
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "getPipSize") {
    chrome.storage.local.get({ pipSizeW: 0, pipSizeH: 0, pipSizeX: null, pipSizeY: null }, (s) => {
      reply({ w: s.pipSizeW, h: s.pipSizeH, x: s.pipSizeX, y: s.pipSizeY });
    });
    return true;
  }
  if (msg.type === "setPipSize" && msg.w > 0 && msg.h > 0) {
    _pipW = msg.w;
    _pipH = msg.h;
    _pipX = msg.x != null ? msg.x : _pipX;
    _pipY = msg.y != null ? msg.y : _pipY;
    chrome.storage.local.set({ pipSizeW: _pipW, pipSizeH: _pipH, pipSizeX: _pipX, pipSizeY: _pipY });
    reply({ ok: true });
    return true;
  }
  if (msg.type === "pipLog") {
    if (msg.msg) console.log(msg.msg);
    reply({ ok: true });
    return true;
  }
  if (msg.type === "updateSites") {
    chrome.storage.local.get({ autoPip: true }, ({ autoPip }) => {
      if (autoPip) updateContentScripts(true);
    });
    reply({ ok: true });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  const now = Date.now();
  const timeSinceLastClick = now - lastClickTime;
  lastClickTime = now;

  if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
    chrome.runtime.openOptionsPage();
    return;
  }

  toggleBrowserPip(tab, "action");
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "open-pip") return;
  flashBadge("KEY", "#1967d2");
  toggleBrowserPip(tab, "command");
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    rememberTab(await chrome.tabs.get(tabId));
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab && tab.active) {
    rememberTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, ([tab]) => {
    if (chrome.runtime.lastError) return;
    rememberTab(tab);
  });
});

function createAutoPipContextMenu(autoPip) {
  chrome.contextMenus.remove("autoPip", () => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create(
      {
        id: "autoPip",
        contexts: ["action"],
        title: "Automatic picture-in-picture (BETA)",
        type: "checkbox",
        checked: autoPip,
      },
      () => void chrome.runtime.lastError
    );
  });
}

chrome.contextMenus.onClicked.addListener(({ menuItemId, checked }) => {
  if (menuItemId !== "autoPip") return;
  chrome.storage.local.set({ autoPip: checked });
  updateContentScripts(checked);
});

function updateContentScripts(autoPip) {
  chrome.action.setTitle({ title: `Automatic picture-in-picture (${autoPip ? "on" : "off"})` });
  chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
  chrome.action.setBadgeTextColor({ color: "#fff" });
  chrome.action.setBadgeText({ text: autoPip ? "★" : "" });

  if (!autoPip) {
    chrome.scripting.unregisterContentScripts({ ids: ["autoPip"] }, () => void chrome.runtime.lastError);
    return;
  }

  chrome.storage.local.get(
    {
      enabledSites:
        "https://www.youtube.com/*\nhttps://youtube.com/*\nhttps://music.youtube.com/*\nhttps://www.netflix.com/*\nhttps://vimeo.com/*\nhttps://www.twitch.tv/*",
    },
    (result) => {
      const sites = result.enabledSites
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"));

      chrome.scripting.unregisterContentScripts({ ids: ["autoPip"] }, () => {
        void chrome.runtime.lastError;
        chrome.scripting.registerContentScripts(
          [
            {
              id: "autoPip",
              js: ["autoPip.js"],
              matches: sites.length > 0 ? sites : ["<all_urls>"],
              allFrames: true,
              runAt: "document_idle",
            },
          ],
          () => {
            void chrome.runtime.lastError;
            injectAutoPipIntoMatchingOpenTabs(sites);
          }
        );
      });
    }
  );
}

function ensureAutoPipConfigured() {
  chrome.storage.local.get({ autoPip: true }, ({ autoPip }) => {
    createAutoPipContextMenu(autoPip);
    updateContentScripts(autoPip);
  });
}

chrome.runtime.onInstalled.addListener(ensureAutoPipConfigured);
chrome.runtime.onStartup.addListener(ensureAutoPipConfigured);
ensureAutoPipConfigured();
