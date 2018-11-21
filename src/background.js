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
    const code = `
      (async () => {
        const video = document.querySelector('video');

        if (video.hasAttribute('__pip__')) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
          video.setAttribute('__pip__', true);
          video.addEventListener('leavepictureinpicture', event => {
            video.removeAttribute('__pip__');
          }, { once: true });
        }
      })();
    `;
    chrome.tabs.executeScript({ code, allFrames: true });
  });
}
