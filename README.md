# Picture-in-Picture Chrome Extension

A Chrome Extension for triggering Picture-in-Picture on any video — manually via toolbar click, or automatically when you switch tabs.

Get it on the Chrome Web Store at https://chrome.google.com/webstore/detail/hkgfoiooedgoejojocmhlaklaeopbecg

<img src="https://raw.githubusercontent.com/beaufortfrancois/picture-in-picture-chrome-extension/master/screenshot.png">

## Configuration

- **Keyboard shortcuts** can be changed on `chrome://extensions/shortcuts`
  - `Alt-P` — activate the toolbar action (toggle manual PiP)
  - `Ctrl-Shift-8` — `open-pip` command, works with global focus
- **Toolbar icon**: single click toggles manual PiP, double click opens the options page
- **Options page** (also reachable from `chrome://extensions` → Details → Extension options): one URL match pattern per line (`*://*.example.com/*` style) selecting which sites auto-open PiP on tab switch. Defaults to YouTube, Netflix, Vimeo and Twitch. Blank list means every site. Lines starting with `#` are ignored.
- **Right-click the toolbar icon** → *Automatic picture-in-picture (BETA)* checkbox turns the automatic behavior on/off; the icon gets a ★ badge while it's on.

---

## How It Works

### Manual PiP (toolbar click / keyboard shortcut)
- `autoPip.js` is the content script; it's registered on the enabled sites and injected into **all frames** on demand when the toolbar action fires on any other page
- The largest playing `<video>` is picked (iframes included) and toggled with the browser's native Picture-in-Picture window
- While a native PiP window is open, a `ResizeObserver` keeps it pointed at the largest playing video — when a playlist advances to a different video element, PiP follows it
- If no playable video is found, the toolbar badge flashes `ERR`

### Auto PiP (tab switch)
- `autoPip.js` runs as a content script on the enabled sites
- Listens to `visibilitychange` — when the tab is hidden, a [Document PiP](https://wicg.github.io/document-picture-in-picture/) window opens automatically (top frame only, so iframes can't race several windows open)
- The video is rendered into a `<canvas>` inside that window, with a title bar, artwork and a full controls bar
- When you return to the tab, the PiP window is closed
- If the Document PiP API is unavailable or the request is rejected, it falls back to the browser's native PiP window
- Also responds to `mediaSession` `enterpictureinpicture` events (Chrome 134+ automatic pip promotion)

> ⚠️ **Auto PiP requires the video to be unmuted and playing.** If the video is muted, Chrome does not treat it as active media and the tab-switch trigger will not fire (or will hit the activation budget limit after ~2 times). Unmute the video for unlimited auto-pip on tab switch.

### Controls in the automatic PiP window
- ▶/⏸ Play / Pause
- ⏮/⏭ Previous / Next track (uses `mediaSession` if available) and ±10s skips
- Seek bar (scrub through video)
- 🔇 Mute toggle + volume slider
- Current time / duration display
- 💾 Save the current window size & position (see below)

The native browser PiP window keeps Chrome's own controls; the custom bar belongs to the automatic Document PiP window.

Controls are **adaptive** — they never disappear, they reflow and shrink with the window:

| Window size | Tier | Layout |
|---|---|---|
| ≥ 390×210 | `large` | two rows (transport, seek + audio) |
| ≥ 290×160 | `medium` | stacked rows (split) |
| ≥ 210×130 | `small` | stacked rows |
| ≥ 150×105 | `tiny` | stacked rows, compact buttons |
| < 150×105 | `nano` | micro layout, everything wraps |

### Size & Position Persistence
The PiP window remembers its last size and position across tabs and sessions.

**How it works:**
- On open: reads stored `w/h/x/y` from `chrome.storage.local` (via the background service worker) and passes them to `requestWindow()`
- On open: calls `pipWin.moveTo(x, y)` to restore the last position
- Save is **manual**: press the 💾 button in the controls bar to store the current size and position. It flashes green for 800ms to confirm
- `pagehide` deliberately does **not** save — auto-closed windows (tab return) would otherwise store drifted sizes

**Why saving is manual (the DPR drift problem):**

On Windows at non-100% display scaling (e.g. 125% DPR), Chrome **continuously** adjusts the PiP window's `innerWidth/Height` even without any user interaction, firing resize events with small growing increments. Findings from investigating this:

- Drift only ever grows the window (2–4px per step) and the final size differs on every open
- `resizeTo()` is silently ignored for Document PiP windows — no error, no effect
- OS resize-handle drags happen outside the document — `pointerdown`/`mousedown` never fire for them, so pointer-based "was this a user resize?" detection is impossible
- `mousemove` near the window edge only works for the top edge; bottom/left/right handles are pure OS chrome
- Timed autosave (1.5s settle, multi-sample size locks, snap-back corrections) all failed because drift continues indefinitely past any settle window

Hence an explicit save button instead of guessing.

### Global State (background.js)
The service worker mirrors the last saved geometry in memory:
```js
let _pipW, _pipH, _pipX, _pipY;
```
`chrome.storage.local` (`pipSizeW`, `pipSizeH`, `pipSizeX`, `pipSizeY`) is the source of truth — `getPipSize` answers straight from storage, so a fresh service worker still returns the right size immediately.

Content scripts communicate via `chrome.runtime.sendMessage`:
- `{ type: 'getPipSize' }` → returns `{ w, h, x, y }`
- `{ type: 'setPipSize', w, h, x, y }` → updates globals + persists to storage
- `{ type: 'pipLog', msg }` → logs to the service worker console (visible in `chrome://extensions` → Service Worker)

---

## Files

| File | Purpose |
|---|---|
| `src/manifest.json` | MV3 manifest — permissions, shortcuts, content scripts, service worker |
| `src/background.js` | Service worker — size/position state, message broker, toolbar actions |
| `src/autoPip.js` | Content script — manual PiP toggle, automatic PiP on tab switch, controls UI |
| `src/options.html` / `src/options.js` | Options page — auto-PiP site list |
| `src/assets/` | Extension icons |
