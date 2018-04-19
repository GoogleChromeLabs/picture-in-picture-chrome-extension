if (!document.pictureInPictureEnabled) {
  chrome.browserAction.setTitle('Picture-in-Picture is NOT supported.');
} else {
  chrome.browserAction.onClicked.addListener(tab => {
    const code = `
      (async () => {
        const video = document.querySelector('video');
        
        if (video.hasAttribute('__pip__')) {
          await document.exitPictureInPicture();
          video.removeAttribute('__pip__');
        } else {
          await video.requestPictureInPicture();
          video.setAttribute('__pip__', true);
        }
      })();
    `;
    chrome.tabs.executeScript({ code });
  });
}
