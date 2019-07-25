// Copyright 2019 Google LLC
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

chrome.storage.sync.get({ optOutAnalytics: false }, results => {
  const optOutAnalyticsCheckbox = document.querySelector('#optOutAnalytics');

  optOutAnalyticsCheckbox.checked = results.optOutAnalytics;
  optOutAnalyticsCheckbox.onchange = _ => {
    chrome.storage.sync.set({
      optOutAnalytics: optOutAnalyticsCheckbox.checked
    }, _ => {
      // Reload extension to make opt-out change immediate. 
      chrome.runtime.reload();
      window.close();
    });
  };
});
