# Recipe order readiness

Content verification and costing are independent. A Verified recipe can still
have Incomplete costs. Recipe cards show both states when applicable.

New Order combines the existing orderable endpoint with active, verified,
incompletely costed recipes from the catalog. Incomplete items remain visible
with muted styling, an Incomplete badge, disabled quantity controls, and an
enabled Complete link to the existing recipe editor. Unknown prices are not zero.
Other exclusions, including unverified or inactive recipes, remain in effect.

The recipe flow retains `/orders/new` as its return destination. Saving uses
the existing catalog/detail/orderable query invalidation; synchronized document
changes also invalidate these queries. Returning after costs are completed
refreshes eligibility. Backend quote/create validation remains authoritative.

Coverage includes all-incomplete and mixed lists, recovery navigation, blocked
selection, and readiness refresh. Chrome DevTools verification uses production
page components with isolated in-memory fixtures, including barcode linking,
save, return to New Order, and enabled selection; it does not mutate shared data.

Implements Neuton-Front #174.
