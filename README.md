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
Installed/standalone windows hide both prompts.

Verify on a production preview: inspect the manifest and worker, wait for worker
activation, switch DevTools offline and reload a nested route. Check that all
shell assets load and no API responses appear in Cache Storage. Check native
installation and standalone launch on Android Chrome and iOS Safari on physical
devices before release; desktop emulation cannot verify OS installation.
