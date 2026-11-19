# New Order release verification

This report covers [T15](https://github.com/Neuton-AI/Neuton-Front/issues/237) for the [New Order initiative](https://github.com/Neuton-AI/Neuton-Back/issues/268). The frontend verification branch builds on [frontend #247](https://github.com/Neuton-AI/Neuton-Front/pull/247) at `4983b2d`. The backend uses [backend #284](https://github.com/Neuton-AI/Neuton-Back/pull/284) and the reviewed delivery-date fix in [backend #285](https://github.com/Neuton-AI/Neuton-Back/pull/285) at `9976859`.

| Scenario | Result | Evidence |
| --- | --- | --- |
| NO-01 Base form | Pass | Chrome exercised the X, separate dates, count controls, long-name truncation, totals and sticky footer. |
| NO-02 Recipe picker | Pass | Chrome used the IndexedDB catalog, search and actual keyboard selection, dismissed the list and restored focus. |
| NO-03 Eligibility | Pass | Selector and draft tests include active verified incomplete, zero and out-of-stock recipes, and reject inactive or unverified recipes. A PostgreSQL order includes a zero-priced partial line. |
| NO-04 Selection price baseline | Pass | Draft tests retain the original 20 through 25 and 30, clear the difference on return to 20, and preserve identity through rename, duplicate names and remove/re-add. |
| NO-05 Unavailable items | Pass | Chrome and component tests retained row/quantity, disabled count changes, preserved removal and reduced the subtotal. |
| NO-06 Reactivation | Pass | Draft and UI tests restored quantity and current pricing. The API requires new review when a confirmed exclusion reappears. |
| NO-07 Reviewed exclusions | Pass | Chrome verified that cancellation and an all-unavailable draft made no create request. Chrome then confirmed an exclusion through Nest and PostgreSQL and persisted only the reviewed available line. |
| NO-08 Save conflicts | Pass | Frontend tests covered price-only, availability-only and mixed conflicts. The integrated Chrome run received a mixed 409 with zero writes, corrected the draft, ran existing sync and required fresh consent before a second create. |
| NO-09 Concurrent writes | Pass | All 18 disposable PostgreSQL race cases passed, covering source changes, numbering, audit and sync replay. |
| NO-10 Final delivery fee | Pass | Verified zero and below-default fees, the distance-free shop default, and preservation of historical fees and totals. |
| NO-11 Calendar dates | Pass | Separate order and requested-delivery dates round-tripped through PostgreSQL across timezones. Legacy requested-date nulls stayed unknown. |
| NO-12 Failure, scope and duplicate guards | Pass | Component and sync tests covered retained draft on failures, old IndexedDB snapshots and one in-flight create. Pending 201 and 409 responses were held while switching shops and returning. The late responses preserved the new draft and did not navigate or force sync. |
| NO-13 Draft network | Pass | Chrome showed no quote or orderable calls. A conflicted save used the existing document-sync flow. |
| NO-14 Responsive Paper states | Pass after fix | Chrome exercised all four states at 390, 320 and 1440 px widths. At 320×550 the footer covered Add item after selection and a $48.00 total clipped. After the fix, the trigger focus stayed above Save, repeated selection opened the picker and reached quantity 2, and $48.00 fit in the 60 px lane. The mobile web viewport was 390×786, with the Paper artboard's 62 px native status area excluded. |
| NO-15 Required fields and discard | Pass | Verified submitted customer/address, calendar defaults, X discard and fresh-on-reload. A Nest regression now rejects a reviewed request missing delivery date with HTTP 400 and no writes. Legacy omission is accepted. |
| NO-16 Partial-profit accounting | Pass | Disposable PostgreSQL verified create, list, detail, sync and dashboard with mixed complete, partial, zero-priced and legacy records. Partial lines retained revenue and contributed zero profit. |
| NO-17 Legacy API retirement | Rollout pending | Malformed legacy recipes are preserved and rejected safely. Both T17 drafts passed the caller audit and verification. Cached clients can still call compatibility endpoints. Retirement awaits deployed-client usage evidence under the backend rollout document. |

The frontend browser fixture mounts the production New Order page and uses IndexedDB with synthetic data. The integration run routes requests to the real Nest order and sync controllers with a fixture identity and disposable PostgreSQL. In that run, a mixed 409 left zero orders, lines, invoice numbers and success audits. After reviewing the refreshed draft, confirmation returned 201 and PostgreSQL contained one order, one zero-priced available line, one invoice number and one success audit. The stored delivery fee was $0 and the delivery date matched the request. Component tests separately verify navigation and historical rendering. For the 390 px proof, Paper and the implemented screen use equivalent states. Calendar values and recalculated totals follow the fixture and the specification.

## Commands

- Frontend `npm run verify` passed lint, type checking, 701 tests across 82 files, and the production build.
- Backend `npm run verify` passed 474 tests, type checking and build. The normal suite skips 60 environment-gated tests.
- Backend `npm run db:validate` passed through migrations 0039, 0040 and 0041.
- Backend `npm run test:postgres -- scripts/new-order-concurrency.integration.test.ts` passed 18 of 18 in isolation on the reviewed-date head.
- Seven other disposable PostgreSQL cases passed across recipe pricing dependencies and sync, document sync, order snapshots and partial profit on the compatibility base.
- The final 320×550 Chrome–Nest–PostgreSQL checkout passed with a fixture identity. Its test server stopped and the disposable database was removed.

[Markup replacement #267](https://github.com/Neuton-AI/Neuton-Back/issues/267) stays deferred. The drafts await review and coordinated rollout.
