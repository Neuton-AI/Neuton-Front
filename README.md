# Neuton-Front

## PWA installation and offline shell

`npm run build` generates `manifest.webmanifest`, the Workbox service worker and
its precache manifest through `vite-plugin-pwa`. `npm run preview -- --host
127.0.0.1` serves the production build locally for verification. Development mode
does not register a service worker.

Deploy the entire `dist/` directory on HTTPS (localhost is allowed for testing),
with SPA navigation fallback to `index.html`. Serve `/sw.js`, `/index.html` and
`/manifest.webmanifest` with `Cache-Control: no-cache`; fingerprinted `/assets/`
files may use `public, max-age=31536000, immutable`. Keep `/sw.js` at the origin
root with a JavaScript MIME type and permit its default `/` scope. Retain hashed
assets from the previous release during deployment to support open tabs.

The worker precaches HTML, every JS route chunk, CSS, bundled Latin fonts and app
icons. API responses, scans and private documents are never runtime-cached. Once
the initial worker installation finishes, the shell loads offline, including
routes not previously opened. Document reads/writes still require connectivity
until the local-first implementation in issue #161. A first visit without any
connection cannot populate the cache. Updates wait until existing app tabs close;
the next launch activates the new shell without interrupting edits or scans.

Dashboard and Profile share the browser install event. Dashboard dismissal lasts
seven days; Profile can still initiate installation. iOS shows Safari Share → Add
to Home Screen guidance. Unsupported browsers show no custom install action.
Installed standalone/fullscreen windows hide both prompts.

Verify on a production preview: inspect the manifest and worker, wait for worker
activation, switch DevTools offline and reload a nested route. Check that all
shell assets load and no API responses appear in Cache Storage. Check native
installation and standalone launch on Android Chrome and iOS Safari on physical
devices before release; desktop emulation cannot verify OS installation.

### Immersive launch and system bars

The manifest requests `display: fullscreen` so supporting Android installations
launch without the status bar or navigation buttons, without a fullscreen toggle.
The browser falls back through standalone, minimal-ui and browser modes when a
mode is unsupported. Ordinary tabs retain browser navigation. This manifest mode
is independent of the Fullscreen API; `document.fullscreenElement` may be null.
We do not call `requestFullscreen()` on launch/resume: it requires a user gesture
and cannot force Android system navigation policy.

Capture suggests a dark system theme (`#181715`); other routes suggest the light
canvas (`#FAF9F5`). The document background and color scheme follow those hints,
including after background/foreground transitions. Four safe-area insets protect
controls while the background extends to the edges. System UI color, icon
contrast, transient bars, keyboard insets and cutout reporting remain controlled
by the browser/OS; these hints cannot guarantee navigation-bar tint or icon
colors on every Android release. A retained softkey bar is a device limitation,
not a passing result for the fullscreen hiding criterion. iOS home-screen apps
may retain status/system UI and do not promise Android-style immersive mode.

For existing installs, deploy the new build and manifest, open the app online,
then close all app windows/tabs and relaunch after the shell update activates.
Android WebAPK manifest updates may arrive later than the service-worker update.
If the old standalone launch persists, first finish/sync pending work, uninstall
the installed app, then install it again from the updated HTTPS site in Chrome.
Launch from its home-screen icon, not a normal browser tab. Reinstallation may
clear local app data; do not use it while unsynced work remains.

Release verification for issue #165 requires a physical Android device. Record
device model, Android and browser versions, installation method and whether it
was a fresh install or an update. Attach real-device before/after screenshots to
the PR; desktop emulation is insufficient. Check:

- Fresh launch with three-button navigation hides both status bar and softkeys.
- Capture and Dashboard backgrounds/system-bar hints update on navigation.
- Closing/relaunching and background/resume preserve the installed display mode.
- Portrait/landscape, cutouts, gesture navigation, transient system bars and the
  keyboard leave close, shutter, source-picker and upload controls reachable.
- Ordinary browser tabs and unsupported installations remain usable. Record any
  retained bars, icon contrast failures and required platform actions explicitly.

References: [manifest display behavior](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display),
[theme hints](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors),
[Chrome manifest updates](https://web.dev/articles/manifest-updates).
