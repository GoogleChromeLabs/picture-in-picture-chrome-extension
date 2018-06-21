if (!document.pictureInPictureEnabled) {
  chrome.browserAction.setTitle({ title: 'Picture-in-Picture NOT supported' });
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
          video.addEventListener('emptied', event => {
            video.removeAttribute('__pip__');
          });
        }
      })();
    `;
    chrome.tabs.executeScript({ code });
  });
}
