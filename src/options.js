// Copyright 2026 Google LLC
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

// Options page: which sites should auto-open Picture-in-Picture on tab switch.

const DEFAULT_SITES = `https://www.youtube.com/*
https://youtube.com/*
https://music.youtube.com/*
https://www.netflix.com/*
https://vimeo.com/*
https://www.twitch.tv/*`;

const sitesTextarea = document.getElementById('sites');
const saveButton = document.getElementById('save');
const resetButton = document.getElementById('reset');
const statusDiv = document.getElementById('status');

// Load saved sites
chrome.storage.local.get({ enabledSites: DEFAULT_SITES }, (result) => {
  sitesTextarea.value = result.enabledSites;
});

// Save settings
saveButton.addEventListener('click', () => {
  const sites = sitesTextarea.value.trim();
  
  chrome.storage.local.set({ enabledSites: sites }, () => {
    showStatus('✓ Settings saved successfully!', 'success');
    
    // Update content scripts
    chrome.runtime.sendMessage({ type: 'updateSites' });
  });
});

// Reset to defaults
resetButton.addEventListener('click', () => {
  sitesTextarea.value = DEFAULT_SITES;
  showStatus('⚠ Reset to defaults (click Save to apply)', 'error');
});

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
