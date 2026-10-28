# Capture controls and carousel proof

Chrome DevTools screenshots at 390 x 848, using the real capture components and state hook in a temporary local harness. Sample PNGs use the app icon. The before views use the main-branch page, upload component, and CSS; the after views use this branch. Camera hardware and authenticated submission were not exercised in this harness.

- camera-before.png / camera-after.png: saved-source camera controls.
- captured-before.png / captured-after.png: first-photo controls.
- carousel-after.png: fourth source reached from the stack review.

Reference: [Paper capture designs](https://app.paper.design/file/01M5CV8CAXEHV9P9M15M4DVETJ/p-1-0).

Verified Upload source picker, Add, review navigation to 4 of 4, reorder and delete; no horizontal overflow at 320, 390, 768, 1024, or 1440px. At 390px, Upload/Send start at y=559 and shutter at y=598; captured circles are 64px with Add 18px higher.

Small-screen follow-up: captured previews adapt to viewport height so Upload remains on-screen with Retake/Add/Send. Verified 375x667, 360x640, and 320x568; captured-small-after.png shows 320x568 and the Upload source picker was opened successfully.
