# Local order drafts

New Order reads recipe documents through the existing scoped catalog query and IndexedDB path. Drafting never calls recipe-orderable or order-quote endpoints, polls for pricing, or persists selections. Active verified recipes with a valid pricing projection are selectable, including incomplete-cost, zero-price and out-of-stock recipes.

Selections retain recipe identity, integer quantity, original unit-price baseline and last known recipe metadata. Successful local catalog reads update the projection without replacing selections. Missing/inactive/unverified recipes remain represented; their quantities count toward the selection count while their amounts are excluded. Failed or pending reads preserve the last successful catalog. A temporarily missing costing projection retains last displayed pricing and blocks Save until pricing is available; it does not establish deletion.

Price differences are keyed by recipe ID and compare current prices with the original selection baseline. Returning to baseline clears the difference. Removal clears the selection and baseline; re-adding establishes a new one. Subtotals sum integer cents, independent of delivery fees. Account/shop changes clear the in-memory draft, and late callbacks cannot restore another scope's selection or navigate after its Save.

Validated Save corrections override the catalog for selected recipes. The backend correction envelope has no document revision, so the overlay remains request-bound until a successful local read matches the corrected availability or price/completeness/name. A stale local render cannot revert the correction. A subsequent Save still revalidates server authority; no automatic resubmission is introduced.

The form supplies required trimmed customer/address, a date-only delivery date, a final delivery fee (including zero), and expected unit prices without overrides or distance. Both dates initially match today in the shop timezone; editing them is independent. Order timestamps represent noon in the shop timezone, including timezone boundaries and DST; delivery dates are never converted to timestamps.

The T09 integration retains the existing catalog-card layout. T10–T12 own the Paper layout, picker, retained unavailable-row presentation and exclusion dialog. Until that consent flow is connected, Save rejects a draft with unavailable selections instead of silently dropping them. T13 owns final confirmation revision handling and sync convergence after Save conflicts. T16 owns authoritative persisted partial-profit accounting; coordinate all provider and caller drafts before rollout.

Rollback restores the previous caller and leaves no persisted drafts or database changes. Keep the backend compatibility routes until T17's caller audit.
