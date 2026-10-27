# Manual recipe amount — ticket #178

Verified through Chrome DevTools against the local frontend/backend using testShop.

- `before.png`: original manual form, with no way to correct recipe usage.
- `after.png`: always-visible recipe amount with weight-only unit choices after
  changing an extracted piece-based ingredient to a gram-based product.
- Manual entry always starts with empty name, price, package size and recipe amount,
  regardless of compatible extracted quantities or API-normalized base amounts.
- `manual-empty.png`: corrected manual form with all fields empty despite the
  original ingredient having a compatible 115 g quantity.
- `saved-cost.png`: replacement retained after saving/reloading; 200 g used from a
  500 g package priced at $10 contributes $4.00. Other ingredients remain unpriced.

Checked required empty usage, normalized display, persistence, cost refresh, and
390 px layout without horizontal overflow. No browser console errors after reload;
existing React Router and mobile-meta deprecation warnings remain in development.

Frontend `npm run verify`: lint, typecheck, 499 tests and production build passed.
Backend `npm run verify`: typechecks, 404 passing tests, 13 existing environment-gated
skips and production build passed. Manual-product route regression tests also passed
after final response-contract assertions.
