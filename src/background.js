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

if (!document.pictureInPictureEnabled) {
  chrome.browserAction.setTitle({ title: 'Picture-in-Picture NOT supported' });
} else {
  chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.executeScript({ file: 'script.js', allFrames: true });
  });
}

// var _gaq = _gaq || [];
// _gaq.push(['_setAccount', 'UA-134864766-1']);

// chrome.runtime.onMessage.addListener(data => {
//   if (data.message === 'enter')
//     _gaq.push(['_trackPageview']);
// });

// chrome.storage.sync.get({ optOutAnalytics: false }, results => {
//   if (results.optOutAnalytics) {
//     return;
//   }
//   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// });
