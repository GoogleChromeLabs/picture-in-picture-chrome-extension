// Checking if context menu is enabled in options
chrome.storage.sync.get({turnOffContextMenu: false}, results => {
    if (results.turnOffContextMenu) {
        return;
    }
    // Set up onclick listener for context menu
    chrome.contextMenus.onClicked.addListener(tab => {
        chrome.tabs.executeScript({file: 'script.js', allFrames: true});
    });

    // Set up context menu at install time
    chrome.runtime.onInstalled.addListener(function () {
        // Create context menu for `page` and `video` type
        let contexts = ["page", "video"];
        for (let i = 0; i < contexts.length; i++) {
            let context = contexts[i];
            let title = "Picture-in-picture";
            chrome.contextMenus.create({"title": title, "contexts": [context], "id": "context" + context});
        }
    });
});
