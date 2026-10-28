# Headless-hook architecture inspection

Audit of `src/` against the Headless Hook frontend architecture skill, taken on the `chore/align-headless-hook-architecture` branch. Every production `.ts` / `.tsx` file under `src/` was inventoried. Tests, factories, and MSW handlers were checked only for boundary violations (features importing pages, views owning server state).

The skill’s bar used here:

- A page, sheet, or modal view is an orchestrator of at most 120 lines, with one `use[Component]` call.
- Presentational children stay within about 80 lines. A mapped row longer than a few lines, a section, a sticky footer, or an inline SVG longer than a few lines is its own component.
- State, effects, route parsing, and server calls live in the companion `.module.ts`. The view receives data, flags, and intent-named handlers.
- A component used by one parent lives in that parent’s folder. Domain APIs and types live in `features/`. Features do not import pages.
- Layout shells take slot props. Forms are rendered from config through `FormFields` and `InputRegistry`.

## What already matched

- Route pages that fetch data already had a `use[Page]` module: Auth, Capture, Catalog, Dashboard, New Order, Orders, Order Detail, Profile, Receipt Detail, Recipe Detail, Recipe Edit.
- Private children that own behavior already had modules: ShopTab, CreateShopForm, AllergenPicker, ProfitChart, ReceiptMerchantEditor, Fab, Sheet, ConfirmDialog, BarcodeScanner.
- `Layout` takes `mainContent`, `actions`, and `footer` slots. Auth, New Order, shop settings, and shop creation already render through `FormFields`.
- Domain APIs, keys, and types live under `features/`. Production features do not import `pages/`. The only page imports under `features/` are integration tests, which ESLint already ignores.
- `NotFoundPage` is presentational and has no business state, so it correctly has no pass-through module.
- `InstallApp` only reads install context. A module that re-exported that hook would be a pass-through, which the skill rejects.

## Mismatches found

### Page views over the 120-line orchestrator budget

These views already delegated data fetching, but they still inlined sections, skeletons, empty states, and row markup.

| File | Lines before | Problem |
| --- | ---: | --- |
| `pages/CapturePage/CapturePage.tsx` | 498 | Camera stage, review carousel, file inputs, and review gestures lived in the page. `useState` / `useRef` stepped the review carousel. |
| `pages/LandingPage/LandingPage.tsx` | 434 | Entire marketing page in one component, including a menu `useState` and inline icons. No module. |
| `pages/RecipeEditPage/RecipeEditPage.tsx` | 399 | Identity fields, ingredient rows, preparation rows, and the scan icon were inlined. The scan SVG was longer than five lines. |
| `pages/RecipeDetailPage/RecipeDetailPage.tsx` | 267 | Hero, ingredients, yield, steps, cost warning, and the action bar were one view. |
| `pages/CatalogPage/CatalogPage.tsx` | 249 | Tabs, three skeletons, recipe cards, and inventory tiles were inlined. Recipe rows were a long `.map()`. |
| `pages/DashboardPage/DashboardPage.tsx` | 214 | Empty shop, header, profit panel, and metric cards were inlined. The view called `refetch()` directly. |
| `pages/ReceiptDetailPage/ReceiptDetailPage.tsx` | 207 | Summary, line items, scan, and actions were inlined. |
| `pages/OrderDetailPage/OrderDetailPage.tsx` | 196 | Summary, items, and delivery were inlined. |
| `pages/OrdersPage/OrdersPage.tsx` | 167 | Filters, skeleton, empty state, and order rows were inlined. The view called `refetch()` directly. |
| `pages/AuthPage/AuthPage.tsx` | 150 | Configuration, heading, mode tabs, and social buttons were inlined. |

`NewOrderPage` (94) and `ProfilePage` (100) were already under 120.

### Logic living in a view

| File | Problem |
| --- | --- |
| `components/DocumentSources/DocumentSources.tsx` | Called `useQueryClient` and `useSignedDownloadUrl`, and opened signed originals. ESLint did not cover this folder. |
| `features/sync/SyncStatus.tsx` | Owned auth, location, query invalidation, and four effects. |
| `features/sync/SyncPopup.tsx` | Owned the error index and recovery routing. |
| `components/BarcodeScanner/BarcodeScanner.tsx` | Owned the manual-entry mode flag beside an existing module. |
| `components/BarcodeScanner/ManualProductForm.tsx` | Owned the whole product form state machine and had no module. |
| `features/pwa/InstallProvider.tsx` | Owned prompt, dismissal, and display-mode effects in the provider component. |
| `App.tsx` | `RequireAuth` called `useLocation` and `useAuth` in the router file. |
| `pages/CapturePage/CapturePage.tsx` | File-input clearing, drop handling, and review swipes were computed in the view. |

### Other structural gaps

- ESLint restricted orchestration imports only for pages and Fab, Sheet, and ConfirmDialog. `DocumentSources` could import the uploads API without a lint error.
- `LandingPage` was a route screen with state and no companion hook.
- `RecipeIngredients` and `OrderItems` mapped row markup longer than a few lines inside the parent.
- `MeTab` mapped shop rows longer than a few lines inside the parent. Left as a residual; see below.
- `App.tsx` was a router file slightly over 120 lines because every lazy import lived beside the gates.

## Accepted exceptions

These stay grouped on purpose. Splitting them would add folders without a second owner or a behavior boundary.

- `components/icons.tsx`, `components/ui.tsx`, and `components/feedback.tsx` are primitive registries. Each export is a small control or icon. They are not page views.
- `features/sync/engine.ts`, `errors.ts`, `documentsApi.ts`, and `store.ts` are domain logic, not views. The line budget does not apply.
- `NotFoundPage` stays module-free.
- `InstallApp` keeps reading context directly.
- `pages/CapturePage/CapturePage.tsx` still keeps `instant`, the keyboard-versus-pointer flag. Nothing else reads it as business state; it only toggles `data-keyboard` and is passed into the review gesture hook.
- `pages/CapturePage/SourcePreview.tsx` keeps an image-load failure flag. That is local visual state.

## Implementation plan and what this branch did

1. Add companion modules where a view owned state or server access: `DocumentSources`, `SyncStatus`, `SyncPopup`, `ManualProductForm`, `InstallProvider`, `LandingPage`, `AppGate`, and `CaptureReview`.
2. Move file-input and drop handling into `useCapturePage`. Move manual-entry mode into `useBarcodeScanner`. Return `handleRetry` from the dashboard and orders modules instead of leaking `refetch`.
3. Split every page view that was over 120 lines into colocated section components. The page file only arranges those sections.
4. Split the allergen dialog, form controls, and the barcode camera from their parents.
5. Extend the view import restriction to `src/pages/**/*.tsx`, `src/components/**/*.tsx`, `src/features/**/*.tsx`, and the app shell, still ignoring tests. Views cannot import `useEffect`, route hooks, TanStack Query, `@/lib/api`, or feature API modules.

Behavior of the screens was kept: class names, accessible names, and the capture file-input contract (the view now forwards the change event to `handleFileInput`; the module still calls `onPick`).

## Residual gaps

These files are still over the 80-line child budget. They no longer own server state. A later pass can extract one more row or field from each.

| File | Lines | Why it remains |
| --- | ---: | --- |
| `components/BarcodeScanner/ManualProductForm.tsx` | 180 | Logic is in `ManualProductForm.module.ts`. Price, package, and usage fields are still in the form file. |
| `features/sync/SyncPopup.tsx` | ~110 | Recovery state is in `SyncPopup.module.ts`. The pill and action row are still one component. |
| `pages/NewOrderPage/OrderItems/OrderItems.tsx` | 105 | Each recipe row is still mapped in the list. |
| `pages/OrderDetailPage/OrderSummary/OrderSummary.tsx` | 102 | Summary, items, and delivery share one file. |
| `components/BarcodeScanner/BarcodeCamera.tsx` | 95 | Viewfinder and typed-barcode form share one file. |
| `pages/RecipeEditPage/IngredientRow/IngredientRow.tsx` | 92 | The scan icon is still inside the row. |
| `pages/DashboardPage/DashboardMetrics/DashboardMetrics.tsx` | 87 | The average/median toggle is still inside the metric grid. |
| `pages/OrderDetailPage/OrderDetailPage.tsx` | 85 | Under the 120-line page budget. Status actions are still in the sheet. |
| `components/ConfirmDialog/ConfirmDialog.tsx` | 83 | Three lines over the child budget. |
| `pages/ProfilePage/ShopTab/ShopTab.tsx` | 82 | Loading skeleton is still in the form view. |
| `pages/CapturePage/CaptureViewport.tsx` | 81 | The saved-source stack is still in the preview. |
| `pages/ProfilePage/MeTab/MeTab.tsx` | 69 | Under 80, but the shop row `.map()` is still inline. |

`NewOrderPage` (94) and `ProfilePage` (100) are pages under 120 lines.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test` after the page splits (529 tests, the capture file-input assertion updated for `handleFileInput`)
- Targeted rerun of barcode, manual product, document sources, form fields, landing, orders view, and recipe edit after the later extractions
