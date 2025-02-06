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

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["script.js"],
  });
});

chrome.runtime.onInstalled.addListener(async () => {
  const { autoPip } = await chrome.storage.local.get({ autoPip: false });
  chrome.contextMenus.create({
    id: "id",
    contexts: ["action"],
    title: "Automatic picture-in-picture (needs refresh)",
    type: "checkbox",
    checked: autoPip,
  });
  updateContentScripts(autoPip);
});

chrome.contextMenus.onClicked.addListener(async (item) => {
  chrome.storage.local.set({ autoPip: item.checked });
  updateContentScripts(item.checked);
});

function updateContentScripts(autoPip) {
  if (!autoPip) {
    chrome.scripting.unregisterContentScripts({ ids: ["content-script"] }).catch(() => {})
    return;
  }
  chrome.scripting.registerContentScripts([{
    id: "content-script",
    js: ["content-script.js"],
    matches: ["<all_urls>"],
    runAt: "document_start",
    world: "MAIN"
  }])
}
