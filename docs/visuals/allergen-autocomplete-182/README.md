# Recipe allergen picker — #182

Paper reference: [Neuton, Page 1](https://app.paper.design/file/01M5CV8CAXEHV9P9M15M4DVETJ/p-1-0), **Edit / Recipe (2 of 2)** and **Edit / Recipe (2 of 2) / Add Allergen Popup**.

- `design-selected.png`, `design-popover.png`: supplied Paper designs.
- `before-mobile.png`: existing default badge list, captured from the base revision in the real app.
- `selected-mobile.png`, `popover-mobile.png`: implemented UI, Chrome DevTools mobile emulation at 390 × 844.

Verified on localhost with the testShop account: selected-only badges, preservation of extracted `eggs` and `wheat`, case-insensitive duplicate exclusion, four suggestions for `s`, keyboard selection and focus restoration, no matches without accidental form submission, Escape dismissal, and save/reopen. The temporary Shellfish addition was removed and the original allergen selection saved again.

Frontend `npm run verify`: lint, typecheck, 523 tests and production build passed. Focused editor tests passed again after formatting and a deliberate inverted-filter mutation failed as expected. Browser console: no errors; existing React Router future-flag and mobile-web-app meta deprecation warnings remain.

The 10 suggestions are local frontend data. Database catalog work remains in [Neuton-Back #184](https://github.com/Neuton-AI/Neuton-Back/issues/184).
