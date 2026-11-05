# Neuton-Front

## Authentication and local routing

The application uses Neuton's HttpOnly cookie session through a single root
`AuthProvider`. Browser requests use the current application origin and include
credentials. Local development opens `http://localhost:5173`; Vite proxies `/api`
to `http://localhost:4000`, matching the backend's default port. Keep `APP_ORIGIN`
on the backend equal to the browser origin. Hosted installations must route
`/api` to the API under the same HTTPS origin. Browser auth needs no Supabase,
Google client-secret, SMTP, or database variables in the frontend bundle.

The provider restores authority from `GET /api/v1/session`, distinguishes
anonymous, pending confirmation, active and unavailable states, and locks a cold
offline launch. Pending accounts reach `/auth/confirm`; active accounts without
memberships reach `/profile` to create their first shop. Signup gives a generic
email notice, confirmation requires a deliberate POST, and users sign in normally
after confirming. `/forgot-password` requests recovery with a generic accepted
message; `/auth/reset-password` submits its transient fragment token only on
user action and returns to normal sign-in. Submitted password and action-secret
state is cleared. Profile provides password changes and a reusable password
verification dialog. Both reload the authoritative session and discard CSRF
state after replacement; verification preserves the intended action for a
deliberate submission. Failed or lost replacement responses recheck authority
and offer normal sign-in without replaying the operation.

Google sign-in starts with a CSRF-protected POST and top-level navigation to
Google. `/auth/google/complete` removes its fragment before telemetry starts,
shares one completion POST across remounts, then restores `/session` before
choosing confirmation, onboarding or the approved destination. Cancellation,
expired browser context and email collisions offer an explicit restart or
sign-in-and-link path. Provider tokens never enter browser application state.

Profile shows the server's password/Google descriptors and method capabilities.
Explicit linking preserves the local contact address. Google-only accounts must
verify their linked Google identity before adding a first password; removing
Google requires a remaining password and recent authentication. Verification
returns to account controls for deliberate submission. Method changes reset
CSRF, reload authority and notify other tabs before background work reconnects.

CSRF secrets stay in module memory, with one shared acquisition request and no
mutation replay after failures. Action-link fragments are captured and removed
before telemetry initializes; they are never persisted or placed in navigation
state. `x-client-user-id` restricts a prepared operation to its original account;
it does not authorize anything. The backend cookie and current database state
remain authoritative.

Shop selection and local document partitions include environment and internal
user ID. Membership summaries come only from `/session`; cached memberships do
not grant access. Query caches and pending requests are cleared before another
account is exposed. Logout retains unsent work in its original partition and
removes that account's synced local records. A failed sign-out leaves a locked,
explicitly unconfirmed state with retry controls. Cross-tab notifications contain
only a reload hint, never credentials or an authoritative identity.

Profile lists current and other devices, with individual and all-device sign-out.
Revocation failures remain explicitly unconfirmed. Renewal starts only from a
due foreground interaction; Web Locks coordinate available tabs and the server
enforces its write interval. Expiry locks local authority without transmitting
or discarding unsent work. Tabs accept only account-changed, logged-out,
session-replaced and membership-refresh hints and reload the server session.

Offline documents, pending edits, scans, blobs and conflict resolutions use the
`neuton-owned-v1` identity namespace in `neuton-documents-identity-v2`. Their
environment/user/shop ownership stays stable when the session is replaced.
React Query keys use the same identity boundaries, including prices, order quotes
and signed source URLs. An already-open application can retain its established
identity and saved work during a connection outage; a cold offline launch remains
locked. Reconnection must restore a server session and current membership before
any pending work is transmitted.

Account, shop and session-generation changes abort requests, storage PUTs and
event streams. Local commits and late responses check that generation before
acknowledging queued work or updating the view. Cookie/CSRF transport is confined
to API operations; presigned R2 PUTs omit cookies and carry only their content
type and signed URL. Background synchronization and stream heartbeats do not
renew sessions.

The former `neuton-documents-v1` database and old membership/selection preferences
are quarantined, never relabeled or uploaded into fresh accounts. The previous
offline-data notice offers an explicit discard confirmation. Discard removes
only that legacy data; current partitions and their unsent work remain intact.

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
routes not previously opened. Established users can read saved documents and
queue supported edits or scans offline in their own partition. Pricing and new
order creation require connectivity. A first visit without any connection cannot
populate the cache. Updates wait until existing app tabs close;
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
