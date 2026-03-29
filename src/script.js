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

(() => {
  
  const video = document.querySelector("video");
  if (video && video.hasAttribute("disablepictureinpicture")) { 
    video.removeAttribute("disablepictureinpicture");
    console.log("Removed disablepictureinpicture attribute");
  }

  function findLargestPlayingVideo() {
    const videos = Array.from(document.querySelectorAll('video'))
      .filter(video => video.readyState !== 0)
      .filter(video => video.disablePictureInPicture === false)
      .sort((v1, v2) => {
        const v1Rect = v1.getClientRects()[0] || { width: 0, height: 0 };
        const v2Rect = v2.getClientRects()[0] || { width: 0, height: 0 };
        return (v2Rect.width * v2Rect.height) - (v1Rect.width * v1Rect.height);
      });

    return videos[0];
  }

  
  async function requestPictureInPicture(video) {
    try {
      await video.requestPictureInPicture();
      video.setAttribute('__pip__', true);
      video.addEventListener('leavepictureinpicture', () => {
        video.removeAttribute('__pip__');
      }, { once: true });

      new ResizeObserver(maybeUpdatePictureInPictureVideo).observe(video);
    } catch (error) {
      console.log("Error entering PiP:", error);
    }
  }

  function maybeUpdatePictureInPictureVideo(entries, observer) {
    const observedVideo = entries[0].target;
    if (!document.querySelector('[__pip__]')) {
      observer.unobserve(observedVideo);
      return;
    }
    const newVideo = findLargestPlayingVideo();
    if (newVideo && !newVideo.hasAttribute('__pip__')) {
      observer.unobserve(observedVideo);
      requestPictureInPicture(newVideo);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.message === "enterPictureInPicture") {
      const video = findLargestPlayingVideo();
      if (!video) {
        console.log("No video element found!");
        sendResponse("no video");
        return true;
      }

      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(error => {
          console.log("Error while exiting Picture-in-Picture:", error);
        });
      } else {
        requestPictureInPicture(video);

        // Media Session using nexttrack and previoustrack
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          video.currentTime += 10;
          console.log("Skipped forward 10 seconds");
        });

        navigator.mediaSession.setActionHandler("previoustrack", () => {
          video.currentTime -= 10;
          console.log("Skipped backward 10 seconds");
        });

        navigator.mediaSession.setActionHandler("play", () => {
          const playBtn = document.querySelector('button[data-purpose="play-button"]');
          if (playBtn) {
            playBtn.click();
            console.log("Play button clicked");
          } else if (video.paused) {
            video.play().catch(() => {});
            console.log("Fallback: video.play()");
          }
        });

        navigator.mediaSession.setActionHandler("pause", () => {
          const pauseBtn = document.querySelector('button[data-purpose="pause-button"]');
          if (pauseBtn) {
            pauseBtn.click();
            console.log("Pause button clicked");
          } else if (!video.paused) {
            video.pause();
            console.log("Fallback: video.pause()");
          }
        });
      }

      sendResponse("done");
      return true;
    }
  });
})();
