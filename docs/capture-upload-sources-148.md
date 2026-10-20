# Capture native upload picker (#148)

Browse opens the browser's native file picker directly on every device. Desktop uses its normal file dialog; mobile uses its browser/OS source picker. There is no app-provided source chooser, device detection, or forced camera capture. The existing image/PDF support, 10 MB limit, preview/upload flow, and separate in-app camera remain available. Resetting the input before opening permits selecting the same file again; cancellation preserves the current document.

## Native mobile menu limitation

A website cannot require the mobile native picker to show exactly Gallery, File explorer and Native camera, rename its entries, or hide extra providers. `accept` is a file-type hint. `capture` requests a capture control and does not configure a three-option menu. Adding capture would also change the default selection flow, so Browse does not use it. Camera availability and native picker choices depend on the OS/browser; selecting a camera entry, when offered, uses that platform's permission flow.

Reference: https://www.w3.org/TR/html-media-capture/

The exact-three-native-options requirement is unsupported by standard web APIs and remains unresolved. The previous custom sheet was removed following the user's clarification.

## Verification

Automated tests cover direct picker invocation, same-file retry, cancellation preserving selection, and the lack of a custom chooser/capture override. Existing format/size/upload and camera tests remain in place.

Chrome DevTools MCP verification was blocked by its browser-profile lock. No physical iOS/Android devices were available. Native menu contents, capture confirmation/upload, permission denial, and cancellation on those devices are unverified. Record exact device/OS/browser versions and native source menus when devices are available; do not mark the native-menu acceptance criterion complete.
