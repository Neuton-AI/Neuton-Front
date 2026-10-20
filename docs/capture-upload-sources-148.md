# Capture upload sources (#148)

Capture offers three app-provided sources. Gallery uses an image-only file input with no capture request; File explorer uses the supported image and PDF types; Native camera uses the supported image types with `capture="environment"`. All three feed the same 10 MB validation, preview and upload flow. Opening the chooser releases the in-app camera stream; closing it resumes the in-app camera when no document is selected.

The browser/OS controls native source menus and permissions. `accept` filters files and `capture` requests a rear-facing capture; neither guarantees a specific picker menu or direct camera launch. A browser without native capture support can show its file picker instead. This fallback has not been observed on physical devices in this change and must be verified before marking the device criteria complete. The app does not request a second web-camera permission for native capture. Native picker denial and unavailability are not reliably exposed to JavaScript; recovery instructions and Gallery/File explorer remain available in the chooser. Browsers without the input `cancel` event may leave the chooser open after cancellation; users can close it or select another source without losing their existing document.

## Verification record

Automated component and hook checks cover source routing, input filters/capture requests, shared validation/upload, cancellation, camera lifecycle and error recovery. These checks cannot establish native camera or OS-picker behavior.

`npm run verify` passed: ESLint, TypeScript, 370 tests across 52 files, and the production build.

Chrome DevTools MCP manual verification is blocked: both listing pages and creating an isolated-context page return a browser-profile lock for the MCP Chrome profile. No manual screenshots or upload evidence were captured. No physical iOS or Android device was available, so reproduction of the reported extra native options remains pending.

| Device / OS / browser                | Actual native picker options | Native capture / upload | Status                        |
| ------------------------------------ | ---------------------------- | ----------------------- | ----------------------------- |
| Representative iPhone / iOS / Safari | Not observed                 | Not tested              | Pending physical-device check |
| Representative Android / Chrome      | Not observed                 | Not tested              | Pending physical-device check |

For each device, sign in as the ticket's test user and select testShop. Record the exact model, OS and browser versions. Exercise all three sources and record the native menus, permission allow/deny, unavailable-camera fallback, confirmed photo preview/upload, and cancellation both with and without an existing selection. Confirm all supported image formats and PDF via File explorer, invalid/oversize rejection, and the separate in-app shutter. Attach Chrome DevTools screenshots of the app flows and physical-device evidence of native pickers/capture before completing the remaining ticket DOD.
