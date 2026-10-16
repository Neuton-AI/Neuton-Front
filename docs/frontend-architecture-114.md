# Frontend architecture migration — issue 114

The implementation follows the 16 October audit at commit `a0501c5` and the supplied `headless-hook-frontend-architecture` and `headless-hook-frontend-testing` documents. React, Router, TanStack Query, Tailwind, routes, and backend contracts are retained.

## Ownership and public contracts

- `pages/<Page>/`: all ten data/state pages have a named `use<Page>` companion `.module.ts`; JSX, styles, accessibility and presentation formatting remain in the view. Private children live below their owner. ShopTab, CreateShopForm, SignedScan and ProfitChart own modules where behavior exists.
- `components/`: Fab, Sheet and ConfirmDialog delegate their lifecycle to modules. Layout composes required `mainContent` and optional `actions`/`footer` ReactNode slots. FormFields renders typed input/textarea/group/custom configurations using the existing controls; modules own values, validation and submission.
- `features/`: analytics, auth, inventory, orders, receipts, recipes, shops and uploads own domain APIs, keys, types and selectors. `lib/api.ts` contains generic HTTP transport only; cache policy and debounce remain generic shared infrastructure. Features do not import pages.
- `test/`: fresh provider-aware render/renderHook helpers, shared typed factories, auth boundary fixtures, and strict MSW handlers. Browser production code never imports MSW.

Model types are exported from their modules; views receive the values, flags and intent handlers they consume, rather than query/mutation result objects. Cross-area imports use `@/`. ESLint rejects orchestration imports in views and page imports in features.

## Audit disposition

| Finding | Implementation or justified exception |
| --- | --- |
| A1: mixed view/behavior | Ten page pairs plus private/stateful and shared lifecycle units; colocated hook tests for every data page. Remaining view expressions select labels/classes or format values. |
| A2: combined domain layer | Removed `lib/queries.ts`; moved domain types out of HTTP transport, auth/membership and upload behavior into features. Query keys and cache relationships remain unchanged. Membership persistence continues to use the external Supabase SDK hook, preserving its RLS/storage contract rather than adding a second query cache. |
| A3: folders, ownership, aliases | Named page/component folders and nested private children. Cohesive public primitive libraries (`ui`, `feedback`, `icons`) remain grouped intentionally: splitting every tiny primitive adds indirection without improving ownership. Landing's visual menu and presentational NotFound do not have pass-through hooks. |
| A4: repeated shells | Dashboard, Catalog, Orders and Profile use Layout slots while preserving their existing wrapper classes and DOM order. Detail sheets and capture keep their distinct established containers. |
| A5: handwritten forms | Auth, New Order, shop settings and shop creation use typed configuration/registry rendering; custom order items use a named custom field. Registry, visibility, grouping and validation are tested at the engine boundary. |
| T1: uncovered workflows | Added direct Capture, New Order, Profile, ShopTab and CreateShopForm tests plus light views and real-layer smoke tests. Camera frame capture, late stream resolution, preview revocation, file rejection, quotes/debounce, normalized writes, errors, permissions and navigation are asserted. |
| T2: no layer contracts | Colocated module tests, retained useful rendered regression suites, new orders/recipes/receipts API tests, production retry and debounce tests. Polling stops at terminal/review statuses; writes assert payloads and cache invalidation/removal. Existing transport/upload tests remain intact. |
| T3: permissive mocks | Shared MSW server rejects unhandled HTTP. Domain handlers reject missing credential/shop context. Important-page smoke tests keep page/module/query/transport real. Legacy deterministic boundary tests remain for their focused regressions; they are complemented, not relabeled as HTTP tests. |
| T4: duplicate fixtures/providers | Shared shop/recipe/receipt/order/analytics factories and one provider implementation for views/hooks. Common inline shop fixtures in five existing page suites now use the shared builder. One-off scenario fixtures remain local. |
| T5: ineffective history assertion | Sheet uses a two-entry test router and proves arrival at the previous route; global history is restored after every test. |
| T6: timing, selectors, destinations | Removed arbitrary sleep, made timer cleanup failure-safe, replaced conditional keyboard traversal with explicit focus expectations, changed invalid-value loops to parameterized cases, replaced paragraph-count assertions with visible content, used recipe status accessible labels, and asserted recipe/receipt deletion destinations. SVG geometry assertions are retained intentionally: they protect the financial-chart bucket/flat-line regression and complement independent numerical-series tests. |
| Configuration | Lint enforces the main dependency boundaries. Coverage runs in CI and is uploaded as an artifact, with no numerical target replacing behavioral assertions. |

## Behavior corrections

1. Normal Orders results never include fabricated sample sales, including empty status filters. Demonstration fixtures live only in test infrastructure.
2. Catalog and Recipe Detail share recipe ingredient-link selectors. Explicit server flags/counts are honored, and supermarket `generalPriceId` links count when optional metadata is absent.
3. Sheet history tests prove back navigation rather than accepting a no-op.

The extraction also closes the camera's late-permission cleanup leak, rejects direct member-only actions in modules, and surfaces rejected sign-out through the existing notice. Sign-out uses router navigation after SDK success, preserving the authentication destination.

## Validation and limits

Validation: lint passed with zero errors/warnings; typecheck passed; **47 files / 306 tests passed** through the full V8 coverage run; production build passed (728 modules). The original 214 regression tests remain protected; numerical/chart geometry cases are retained rather than weakened. Total line/statement coverage is **93.99%**, branch coverage **86.52%**, and function coverage **84.36%**, compared with audit line coverage 71.48%. No unmatched-route or React act warnings occurred. Node 24.14.0 was used locally; CI remains on Node 22.

Hosted Chrome DevTools screenshots are linked in the PR from immutable evidence commit `96d9415492ac048e116d8722654d61543499f5dd`. Screenshots are kept on an evidence-only branch, outside application source. CI uploads text/HTML/JSON coverage output as an artifact.

Material remaining gaps include the external Supabase subscription/error lifecycle, some multi-shop and catalog inventory presentation branches, signed-scan PDF/error presentation, and several defensive mutation branches. The migration keeps the existing SDK/RLS and backend extraction contracts; HTTP interception does not establish third-party availability or OCR correctness.

Chrome verification used `testtest@gmail.com` and `testShop`. Live checks covered authentication/deep-link return, dashboard/catalog, order creation/delivery/cancellation, synthetic receipt storage/upload/deletion, and shop settings. Controlled responses covered upload rejection, empty order filters, member permissions, and recipe/receipt review transitions/deletion navigation. Existing recipes were preserved. The synthetic receipt was deleted; the QA order follows the backend's cancellation/audit-record policy.

An existing settings limitation was observed: the seeded per-km rate `0.80` does not satisfy the inherited HTML `step=0.25`, so native submission rejects that unchanged value. The form handler/API save was verified with the same values. The step and backend values are preserved because this ticket explicitly limits behavior changes; this pre-existing mismatch requires a separate product decision/fix.
