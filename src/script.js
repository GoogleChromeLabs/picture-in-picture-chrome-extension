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


(async () => {
  
  const vidArea = Symbol("video area")
  
  /**
   * Returns the area of a video dom element
   */
  function videoArea(video) {
    return (video.getClientRects()[0].width || 0) * (video.getClientRects()[0].height || 0);
  }
  
  function findLargestPlayingVideo() {
    console.log(Array.from(document.querySelectorAll('video'))
    .filter(video => video.readyState != 0)
    .filter(video => video.disablePictureInPicture == false)
    .map(v => {
      v[vidArea] = videoArea(v);
      return v;
    }))
    
    const largestVideo = Array.from(document.querySelectorAll('video'))
      .filter(video => video.readyState != 0)
      .filter(video => video.disablePictureInPicture == false)
      .map(v => {
        v[vidArea] = videoArea(v);
        return v;
      })
      .reduce((a, b) => a[vidArea] - b[vidArea] > 0 ? a : b, { [vidArea]: 0 });
  
    if (largestVideo[vidArea] === 0) {
      console.log('no videos')
      return null;
    }
  
    return largestVideo;
  }
  
  async function requestPictureInPicture(video) {
    await video.requestPictureInPicture();
    video.setAttribute('__pip__', true);
    video.addEventListener('leavepictureinpicture', event => {
      video.removeAttribute('__pip__');
    }, { once: true });
    new ResizeObserver(maybeUpdatePictureInPictureVideo).observe(video);
  }
  
  function maybeUpdatePictureInPictureVideo(entries, observer) {
    let activePips = [];
  
    for (const video of entries) {
      if (!video.getAttribute('__pip__')) {
        observer.unobserve(video);
        continue;
      } else {
        activePips.push(video);
      }
    }
    const newVideo = findLargestPlayingVideo();
    if (newVideo && !newVideo.hasAttribute('__pip__')) {
      activePips.forEach(p => observer.unobserve(p));
      requestPictureInPicture(newVideo);
    }
  }
  
  const video = findLargestPlayingVideo();
  if (!video) {
    return;
  }
  if (video.hasAttribute('__pip__')) {
    document.exitPictureInPicture();
    return;
  }
  await requestPictureInPicture(video);
  chrome.runtime.sendMessage({ message: 'enter' });
})();
