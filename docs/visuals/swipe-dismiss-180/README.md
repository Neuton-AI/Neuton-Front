# Detail sheet dismissal — #180

Updated threshold: dismiss only when the downward pull exceeds 15% of the
viewport height. At or below 15%, the existing slide-back transition restores
the sheet. All 31 sheet tests pass, including exact-boundary cases across
400px, 800px, and 1200px viewports. A new browser check was blocked by the
DevTools Chrome profile lock; the screenshots below document the earlier check.

Chrome DevTools verification used testShop at a 390 × 844 mobile viewport.
Dragging the recipe title down returned to the recipes catalog. Dragging the
receipt title down returned to `catalog?tab=receipts`; the images show the
receipt before and after that gesture. Escape also returned to the catalog.

Automated touch-event tests cover content scrolling, handle dragging while
scrolled, short/upward/horizontal pulls, cancellation, multiple fingers,
interactive controls, and nested dialogs. Physical-device touch verification
is still useful; DevTools drag verification exercised mouse input.

Validation: lint, TypeScript, all 508 tests in the initial full suite, production
build, and all 23 sheet tests after four additional edge cases. Inverting the
dismissal threshold caused five regression tests to fail; the original condition
was restored and all 23 sheet tests passed.

Browser console: no errors; existing React Router future-flag and mobile meta
deprecation warnings remain.

Touch listener design follows the browser guidance for selectively preventing
native scrolling during a claimed gesture:
https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
