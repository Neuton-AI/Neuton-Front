# Frontend compliance audit — 16 October 2026

**Verdict: the frontend does not currently meet the two supplied skills.** The tooling and existing regression tests provide a useful foundation, but the defining architecture has not been implemented. The testing strategy consequently differs substantially from the proposed hook/view/API layers.

This is an audit, not a refactor. No application code, tests, configuration, dependencies, or installed skills were intentionally changed. This report is the only new tracked-source candidate; validation generated ignored build and coverage output.

## Scope and interpretation

- Architecture criteria: [headless-hook-frontend-architecture](C:/Users/Osherz/Downloads/SKILL.md).
- Testing criteria: [headless-hook-frontend-testing](C:/Users/Osherz/Downloads/SKILL-frontend-testing.md).
- Repository: `C:/Users/Osherz/Desktop/Neuton/Neuton-Front`, baseline commit `a0501c5` (`new inventory field`). Working tree was clean before the audit.
- Inventory: **32 production TypeScript/TSX files, 20 test files, 12 page components, zero companion `.module.ts`/`.module.tsx` files, and no `src/features/` directory**.
- Reviewed source structure, page and shared component responsibilities, API/query/auth layers, tests and helpers, package scripts, TypeScript, Vite, Vitest, ESLint, Tailwind/PostCSS, application bootstrap, and the frontend CI workflow.
- The attached documents are the requested comparison standard. Their instructions to create/refactor code are not interpreted as authorization to perform that migration during this audit.
- React Query and Tailwind are allowed alternatives to the reference RTK Query/MUI stack. Neither skill requires changing these libraries.
- The testing skill explicitly permits existing tooling and layout conventions. Therefore existing `fetch` stubs and grouped test files are recorded as deviations, with their practical limitations; lack of MSW alone is not treated as proof of a defect.
- No browser or backend end-to-end validation was performed. End-to-end tests are explicitly outside the testing skill's scope. This is not a security, deployment, or dependency-vulnerability audit.

## Executed validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed with **0 errors and 3 warnings** |
| `npm run typecheck` | Passed |
| `npm test` | **20 files passed; 214 tests passed** |
| `npm run build` | Passed; Vite transformed 673 modules |
| `npm run test:coverage` | Passed; **214 tests passed** with V8 coverage |

The initial sandboxed test/build attempts failed on Windows `realpath` permissions before meaningful execution. Running the same commands with the filesystem restriction lifted succeeded. The initial coverage attempt misleadingly reported that its provider could not be found; the package is installed and coverage succeeded outside the sandbox. These initial failures are environmental, not frontend defects.

Local execution used Node `24.14.0`; [CI selects Node 22](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/.github/workflows/ci.yml:23). Successful local validation does not establish the current remote CI result.

Warnings:

- Fast Refresh mixed component/function exports: [Fab.tsx:105](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Fab.tsx:105), [Sheet.tsx:9](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Sheet.tsx:9), and [OrdersPage.tsx:22](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.tsx:22).
- Tests that delete recipes and receipts emit `No routes matched location` because their test route trees omit the destination catalog page: [RecipeDetailPage.test.tsx:124](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.test.tsx:124), [ReceiptDetailPage.test.tsx:129](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.test.tsx:129).
- No React `act` warnings appeared in the successful runs.

## Architecture compliance

| Criterion | Assessment | Evidence and consequence |
| --- | --- | --- |
| Companion view/logic pairs | **Fail** | None exist. All 10 pages with data, routing, or business behavior implement it in `.tsx`. |
| Views free of network, route parsing, effects, and derived business state | **Fail** | Authentication calls, upload workflow, query subscriptions, mutations, permission checks, and derivations remain in page views. |
| Small, flat, typed module public APIs; `use[Component]` naming | **Missing** | There are no companion hooks to evaluate. Query hooks return framework results, which is appropriate at the data layer, but pages consume those results directly instead of adapting them through modules. |
| Fractal component ownership and one folder per component | **Fail** | Pages/components are flat; several private children are additional functions in the parent's source file. Ownership is often logically local, but the required folder/file structure is absent. |
| Domain features containing endpoints and payload types | **Fail** | All domains share `lib/queries.ts` and `lib/api.ts`; auth/membership data lives in `lib/supabase.ts`. |
| Cached server state rather than redundant global copies | **Mostly pass** | TanStack Query owns the main API cache. Memberships use a separate stateful Supabase hook, requiring manual reloads. |
| Slot composition and shared page shells | **Partial** | Several shared components already accept `ReactNode` slots, but no shared page `Layout` exists; page shell/navigation structure is repeated. |
| Schema/config-driven forms and input registry | **Fail** | Forms are handwritten in Auth, New Order, and Profile. Reusable input primitives exist, but there is no registry or schema renderer. |
| `@/` imports across top-level areas | **Fail** | Alias is configured correctly, but source/test imports across areas consistently use relative paths. |

### A1 — High: the required separation of presentation and logic is absent

High here means a blocker to adopting the requested standard, not an assertion that every affected page is broken.

| Page | Current responsibilities that belong in its module | Example location |
| --- | --- | --- |
| Auth | Route state/navigation, credentials and submission state, effect on mode change, direct Supabase sign-in/sign-up | [AuthPage.tsx:9](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/AuthPage.tsx:9), [submission:40](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/AuthPage.tsx:40) |
| Capture | URL parsing, file validation, camera lifecycle, preview lifecycle, upload and navigation | [CapturePage.tsx:30](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CapturePage.tsx:30), [effects:49](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CapturePage.tsx:49), [upload:133](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CapturePage.tsx:133) |
| Catalog | URL tab selection, three queries, error aggregation, retries, ingredient-link completeness | [CatalogPage.tsx:34](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.tsx:34), [derivation:206](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.tsx:206) |
| Dashboard | Auth/shop subscriptions, navigation, period and profitability state, analytics query and chart series | [DashboardPage.tsx:21](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/DashboardPage.tsx:21) |
| New Order | Draft lines, quantities, debounce, quote query, payload normalization, save/navigation | [NewOrderPage.tsx:20](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/NewOrderPage.tsx:20), [handlers:80](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/NewOrderPage.tsx:80) |
| Orders | Filter state, query, fallback data, sorting | [OrdersPage.tsx:79](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.tsx:79) |
| Order Detail | Route parsing, queries/mutations, confirmation state, navigation, margin calculation | [OrderDetailPage.tsx:14](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrderDetailPage.tsx:14) |
| Profile | Account/shop state, sign-out, shop creation, settings queries, permission logic and form synchronization | [ProfilePage.tsx:13](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:13), [ShopTab:197](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:197) |
| Receipt Detail | Route parsing, queries/mutations, verification payload, role gating, delete and navigation | [ReceiptDetailPage.tsx:14](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.tsx:14) |
| Recipe Detail | Route parsing, queries/mutations, role gating, instruction parsing, ingredient linking and delete | [RecipeDetailPage.tsx:13](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.tsx:13) |

Shared units also contain behavior that the skill puts in modules: [Fab's document listeners](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Fab.tsx:20), [Sheet's keyboard/scroll lifecycle](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Sheet.tsx:33), and [ConfirmDialog's focus/keyboard lifecycle](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/ConfirmDialog.tsx:37). Moving these effects is a structural requirement; the behavior itself is valid and tested.

Exceptions matter: NotFound is presentational, and Landing's menu toggle is local visual state. Neither needs an empty companion hook merely to increase the pair count. Pure buttons, icons, headers, and similar children also should not acquire pass-through modules.

### A2 — High: business domains have no feature boundaries

[queries.ts](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/queries.ts:29) combines analytics, recipes, inventory, receipts, orders, shops, downloads, and debounce. [api.ts](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/api.ts:123) combines generic transport with all domain response/payload types.

The skills call for domain ownership, not merely moving these two files into a folder named `features`. Keep generic transport and query-client setup shared; split endpoints, query keys, domain types, and domain rules into their business features. A page module can then compose several features. The existing data layer does not import pages, which is a positive boundary to preserve.

### A3 — Medium: component colocation and public naming do not match

There is no page/component folder structure. Private children include [Catalog's ReceiptRow](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.tsx:321), [Dashboard's ProfitChart](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/DashboardPage.tsx:245), [Profile's MeTab/ShopTab/CreateShopForm](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:110), and [Receipt Detail's SignedScan](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.tsx:273).

These should live below their owners when extracted. ShopTab and SignedScan own queries/state and require their own modules. The current same-file placement does preserve deletion ownership, so this is a prescribed-structure gap rather than evidence that these children have been placed in unrelated global folders.

[ui.tsx](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/ui.tsx:42), [feedback.tsx](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/feedback.tsx:3), and [Sheet.tsx](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Sheet.tsx:98) group multiple components per file rather than following the strict one-folder-per-component rule. Existing cohesive primitive libraries are lower priority than separating page business logic.

The alias is present in [TypeScript](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/tsconfig.json:22) and [Vite](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/vite.config.ts:7), but imports such as [NewOrderPage.tsx:3](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/NewOrderPage.tsx:3) do not use it across areas.

### A4 — Medium: slot composition is established locally, but page layout is duplicated

Good examples already exist: [PageHeader.action](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/PageHeader.tsx:4), [StatCard.middle/value/sub](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/StatCard.tsx:3), [Fab.action](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Fab.tsx:5), and [Sheet.children](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Sheet.tsx:18).

However, Dashboard, Catalog, Orders, and Profile each rebuild their shell, scrolling/padding region, actions and bottom navigation. Compare [DashboardPage.tsx:73](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/DashboardPage.tsx:73), [CatalogPage.tsx:101](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.tsx:101), and [ProfilePage.tsx:43](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:43). A shared slot-based layout should own these mechanics. Existing CSS `.shell` shares styling but cannot provide that composition contract.

### A5 — Medium: reusable controls are not schema-driven forms

Handwritten forms appear at [AuthPage.tsx:117](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/AuthPage.tsx:117), [NewOrderPage.tsx:120](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/NewOrderPage.tsx:120), [Profile ShopTab:275](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:275), and [CreateShopForm:408](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:408). Fields, HTML validation, conditional visibility and event wiring are embedded in JSX.

There is no input registry, typed field/step configuration, or generic form renderer. The existing Input/Select/Textarea/Field primitives can support one. Put validation and submission in the relevant module; keep registry/schema tests at the engine layer. The dynamic order-item selector may need a custom field type, but the skill asks to extend the configuration model rather than bypass it.

## Testing compliance

| Criterion | Assessment | Evidence |
| --- | --- | --- |
| Colocated tests and mirrored source names | **Mostly pass** | Most tests sit directly beside their source. `chrome.test.tsx` groups four components and a hook; this is an existing convention, permitted by the skill's provenance note. |
| Most business logic tested through hook public APIs | **Fail** | No companion module tests; only `supabase.test.ts` directly uses `renderHook`. Page behavior is mainly exercised through rendering. |
| Thin view tests mocking their companion modules | **Missing** | No companion modules exist. Current page tests combine view and logic responsibilities. |
| Feature API request, error and cache tests | **Partial** | Good transport/upload tests and some page-mediated endpoint checks; no dedicated query-layer test file or full cache contract suite. |
| Important page integration smoke tests | **Partial** | Real page/query/router integration exists, but most page tests mock the owned `apiFetch` function and auth hooks. No important-page smoke suite keeps the entire HTTP path real. |
| Observable behavior, accessible queries, awaited interactions | **Mostly pass** | Role/label queries and awaited `userEvent` are common; isolated structural assertions and a weak history test remain. |
| Typed mocks, factories, shared handlers | **Partial** | Typed local domain builders and partial mocks exist, but shared domain fixtures are duplicated and many spies are untyped. No shared network handler layer. |
| Reset and isolation | **Mostly pass, gaps** | `clearMocks`/`restoreMocks`, RTL cleanup, and fresh QueryClients are configured. Global history and fake-timer cleanup have exceptions. |
| Loading, empty, errors, async rejection, boundary cases | **Partial** | Several valuable mutation/formatting/empty-state tests, but three important pages are entirely unexecuted and other page state coverage is uneven. |
| Determinism and waiting for conditions | **Partial** | Most waits are condition-based; one arbitrary sleep and assertion-path timer restoration remain. |
| No giant snapshots or silent skips | **Pass in inspected suite** | No snapshot assertions, skipped/todo tests, or test retry configuration found. |
| Shared provider and hook helpers | **Partial** | Shared render helper exists; no provider-aware renderHook helper. |

### T1 — High: three important pages have zero execution coverage

| Source | Measured line coverage | Missing behavior |
| --- | --- | --- |
| [CapturePage](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CapturePage.tsx:30) | **0%** | Camera denied/unavailable, stream cleanup, file type/size validation, preview revocation, upload progress/failure, successful navigation |
| [NewOrderPage](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/NewOrderPage.tsx:20) | **0%** | Quantity boundaries, quote debounce/loading/error, payload normalization, rejected creation, pending guards, successful navigation |
| [ProfilePage](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ProfilePage.tsx:13) | **0%** | Shop creation/switching, member read-only behavior, settings hydration/save/failure, sign-out |

[App.test.tsx:48](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/App.test.tsx:48) replaces these pages with heading stubs. Those tests prove route selection, not the pages' behavior. The upload service's tests also do not cover Capture's validation or camera lifecycle.

### T2 — High: layer-specific contracts are not independently protected

The detail tests verify useful real behavior but do it through pages, for example [receipt verification](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.test.tsx:166) and [order delivery](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrderDetailPage.test.tsx:161). Preserve those regression scenarios while moving handler/state assertions into modules and reducing view tests to output and wiring.

[queries.ts](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/queries.ts:74) has no dedicated tests. Page tests execute parts of it, giving it **77.23% line coverage**, but that does not prove all required behavior: query enablement without credentials/shop, polling start/stop, quote debounce, cross-screen invalidation, cache removal, or all mutation request contracts. In particular, [useDebouncedValue](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/queries.ts:477) is unexecuted.

[queryClient.ts](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/queryClient.ts:22) has **0% coverage**. Tests use a separate no-retry client, so production retry behavior for 4xx versus network/5xx failures is not exercised. [supabase.test.ts](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/supabase.test.ts:74) covers three membership persistence cases, but not the complete auth subscription/error lifecycle or membership failure/refresh/switch behavior.

The existing [apiFetch tests](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/api.test.ts:73) and [upload tests](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/upload.test.ts:31) are valuable and should remain. They are generic transport/service tests rather than a substitute for feature query/cache tests.

### T3 — Medium: integration mocks can silently accept wrong requests and responses

Most data-page tests replace the owned transport instead of intercepting HTTP. Examples: [Catalog mock](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.test.tsx:89), [Recipe Detail mock](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.test.tsx:104), and [Receipt Detail mock](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.test.tsx:105).

Their catch-all branches return successful domain data for unexpected paths/methods. Receipt Detail's mock can even return a receipt envelope for a signed-download request in some scenarios. Most `vi.fn()` transport replacements are not tied to the real generic function signature, so TypeScript does not validate each returned API response.

The repository's existing mocking convention is permitted. The practical missing guarantee is important: page integration tests do not prove the entire URL/header/body/response path together, and unexpected traffic is not globally rejected. Shared strict HTTP handlers, preferably MSW as proposed by the skill, would address this. Keep only auth SDK and other external boundaries mocked as necessary.

### T4 — Medium: duplicated fixtures and missing hook-provider utility

The same shop fixture and auth/membership stubs are copied into [Orders](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.test.tsx:14), [Catalog](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.test.tsx:24), [Order Detail](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrderDetailPage.test.tsx:25), [Recipe Detail](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.test.tsx:24), and [Receipt Detail](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/ReceiptDetailPage.test.tsx:25). Receipt and recipe builders also recur across tests.

Some builders already return domain types, which is good. Promote genuinely shared domain builders to `src/test/factories/`; retain one-off scenario setup beside its test. The existing [renderWithRouter helper](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/test/render.tsx:25) correctly supplies a fresh QueryClient and router. Reuse its provider construction for a hook helper when module tests are introduced.

### T5 — Medium: a passing history test does not prove navigation and leaks browser state

[Sheet.test.tsx:132](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/Sheet.test.tsx:132) claims to test going back. It creates a MemoryRouter with one entry, changes the separate global `window.history` index, clicks Close, and asserts that the MemoryRouter URL remains on the detail page.

That assertion passes if the close handler does nothing. It proves neither a previous route nor successful back navigation. Give the router two actual entries and assert that closing returns to the first. The pushed browser history state is also not restored; [setup.ts:28](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/test/setup.ts:28) initializes it once, not after every test. This is an isolation weakness, although no order-dependent failure was observed in the executed runs.

### T6 — Low/medium: a few explicit test-practice rules are violated

- **Arbitrary real-time wait:** [App.test.tsx:117](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/App.test.tsx:117) sleeps for 20 ms. Assert the rendered sign-in state and stable route through the relevant observable condition instead.
- **Timer restoration is not failure-safe:** [format.test.ts:106](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/format.test.ts:106) and [format.test.ts:118](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/format.test.ts:118) restore timers after assertions. An assertion failure skips restoration; the skill prescribes `afterEach` cleanup.
- **Avoidable structural assertions:** [StatCard paragraph count](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/components/chrome.test.tsx:213) and [SVG path parsing](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/DashboardPage.test.tsx:83) couple tests to markup/renderer details. Keep behavioral regression intent; test numerical transformations in pure utilities and rendering through accessible output. A focused visual/geometry regression can be justified, but this is an intentional departure from the skill's strict wording.
- **Conditional test control flow:** [Catalog keyboard traversal](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.test.tsx:147) uses a loop and branch; [format.test.ts:21](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/lib/format.test.ts:21) loops over cases. Prefer explicit keyboard expectations or `it.each` for independent inputs.
- **Accessible queries available but unused:** [RecipeDetailPage.test.tsx:140](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.test.tsx:140) selects a status dot by test ID despite the element's accessible label. Route-probe test IDs are a reasonable internal test-harness exception.
- **Destination warnings:** the recipe/receipt deletion tests assert the DELETE call but do not prove arrival at the intended list screen; include destination routes and assert navigation.

## Configuration assessment

The current configuration is a sound base, but it does not enforce the new architectural contract.

| Area | Assessment |
| --- | --- |
| TypeScript | Strict mode, unused symbols and fallthrough checks are enabled. `src` includes tests, so the successful typecheck covers them too. |
| Vite/Vitest | Vitest merges Vite configuration; aliases/plugins do not have separate copies to drift. jsdom and explicit Vitest imports fit the existing suite. |
| Mock cleanup | `restoreMocks: true`, `clearMocks: true` and RTL cleanup satisfy core isolation rules. They do not reset arbitrary browser history or guarantee restoration of fake timers/global stubs. |
| Coverage | V8 reports all source files, including entirely untested pages. Test infrastructure, entry point and declaration files are excluded. No threshold is configured; the skills do not mandate a numerical threshold. |
| ESLint | React hook rules, unused-variable checks and explicit-any restrictions are present. No view/module boundary, domain import-boundary, test-query or accessibility rules are configured. Adding these is an enforcement recommendation, not an explicit requirement to use a particular plugin. |
| Accessibility lint | The comment in [eslint.config.js:8](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/eslint.config.js:8) implies clickable-element problems are caught, but no JSX accessibility plugin/rules are present. Passing lint is not evidence of that guarantee. |
| Scripts/CI | Local `verify` and CI run lint, typecheck, tests and build. CI runs ordinary tests, not coverage; adding a coverage report would improve visibility. The skills do not require a specific CI service or threshold. |
| Styling | Shared Tailwind tokens, reusable primitives and reduced-motion CSS exist. Styling belongs in views under the architecture, so CSS/Tailwind usage is compatible. There is no requirement to introduce MUI or CSS modules. |
| Automated a11y | No axe package/check exists. The testing skill makes that recommendation conditional on the project having the tool, so absence is not scored as a violation. |

## Coverage evidence

| Scope/file | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All source | 71.48% | 83.15% | 77.50% | 71.48% |
| Pages | 63.17% | 74.67% | 63.79% | 63.17% |
| Shared components | 88.62% | 92.00% | 78.57% | 88.62% |
| lib | 82.67% | 90.95% | 85.54% | 82.67% |
| CapturePage | 0% | 0% | 0% | 0% |
| NewOrderPage | 0% | 0% | 0% | 0% |
| ProfilePage | 0% | 0% | 0% | 0% |
| queryClient | 0% | 0% | 0% | 0% |
| queries | 77.23% | 89.39% | 84.48% | 77.23% |
| supabase | 64.36% | 68.75% | 33.33% | 64.36% |

These numbers describe executed code, not assertion quality or compliance. In particular, the global branch percentage must not obscure the completely unexecuted pages. [Generated HTML coverage report](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/coverage/index.html) is local ignored output and will be replaced by future coverage runs.

## Additional concrete defects exposed by the audit

These findings are separate from naming/folder compliance. They are established by source and test inspection; no dedicated new reproduction tests or browser sessions were added.

1. **Orders displays a fabricated sale by default for an empty API result.** [OrdersPage.tsx:79](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.tsx:79) defaults `includeStub` to true; [line 95](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.tsx:95) substitutes `STUB_ORDER` whenever the fetched list is empty. [App.tsx:55](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/App.tsx:55) uses the default. The [empty-state test](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/OrdersPage.test.tsx:157) explicitly disables the stub, so it does not protect normal routed behavior. A default routed empty list, including an empty status filter, can show Maya C.'s sample order and a nonexistent detail link. Keep demonstration data outside the normal production path and test the page with default props.
2. **Recipe link completeness is inconsistent between Catalog and Recipe Detail.** With optional server counters/flags absent, [CatalogPage.tsx:207](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/CatalogPage.tsx:207) treats only `inventoryItemId` as a fallback link. [RecipeDetailPage.tsx:95](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.tsx:95) also recognizes `generalPriceId`. The [detail regression test](C:/Users/Osherz/Desktop/Neuton/Neuton-Front/src/pages/RecipeDetailPage.test.tsx:134) covers that input, but Catalog does not. A recipe linked solely to supermarket prices can therefore show a valid linked state in detail while Catalog says its cost is incomplete. Put the rule in a shared recipes-domain selector and test both consumers' output.

## Recommended migration order and completion criteria

1. **Protect the uncovered workflows and correct misleading tests/data.** Prioritize New Order, Capture, Profile, the default empty-orders behavior and actual sheet back navigation. Preserve existing regression scenarios.
2. **Create one complete vertical example.** Orders or Recipe Detail can establish the page folder, companion typed hook, feature APIs/types, module tests, light view tests and a real HTTP smoke test. Do not create empty modules for presentational components.
3. **Split the domain layer and migrate the other stateful pages.** Keep TanStack Query, generic transport and the existing UI stack. Extract private children by ownership. Share recipe-link derivation and other business rules within their features.
4. **Add shared testing infrastructure where it removes duplication.** Typed domain factories, strict network handlers, a reusable provider wrapper and hook helper. Test request contracts, enablement, polling, debounce, cache invalidation/removal, and production retry behavior at their owning layers.
5. **Introduce shared slot layouts and a form schema/registry.** Migrate the existing forms and cover field resolution, validation and conditional visibility. Reuse current primitives.
6. **Add enforcement and clean remaining conventions.** Convert cross-area imports to `@/`, resolve mixed-export warnings, strengthen test/isolation checks, and publish coverage in CI if useful. A numeric coverage target alone is not completion.

Compliance is achieved when all 10 stateful/data pages and complex shared units have the required view/module split, domains own their data contracts, private children follow ownership folders, page layouts and forms follow slots/schemas, and the required layer-specific behavior is asserted with deterministic tests. The current green suite and build are valuable migration safeguards, but they do not satisfy those criteria by themselves.
