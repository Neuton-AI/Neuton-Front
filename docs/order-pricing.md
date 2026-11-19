# Local recipe order pricing

`recipeOrderPricing(recipe)` reads the authoritative `orderPricing` projection
from a synced recipe. Fields use the backend contract: `unitPrice` is a decimal
string with two places, `unitCost` has four places, and `costComplete` preserves
whether full costing is known. Server pricing-data errors take precedence over
legacy costs; an explicit null projection is not silently replaced.

The properties are optional on `Recipe` because initialized IndexedDB records
may predate the projection. The selector supports these records without a
network request: retain a complete recipe's existing retail price and unit cost,
or divide known ingredients plus labor by valid yield for partial recipes.
Partial cost gets no markup. Both steps use the server's rounding convention.
Missing/invalid known costs produce `ORDER_PRICING_UNAVAILABLE`; invalid yield
produces `INVALID_RECIPE_YIELD`. No missing field is treated as a zero price.
The selector never changes the recipe or its existing null costing fields.

Backend migration `0039_recipe_order_pricing_sync.sql` advances active recipe
revisions once. The existing sync engine downloads the new projection, retaining
stable `syncVersion` and existing scope/queue behavior. Equal versions need no
extra download. A failed download keeps the previous local recipe readable.
No picker pricing request or screen-specific polling is introduced.

Optimistic ingredient, yield, prep-time or recipe-margin edits mark order pricing
unavailable until a costed server snapshot arrives. Renaming preserves pricing.
This prevents stale server prices or old partial subtotals from being presented
as current while a cost edit is pending.

This provider does not switch New Order's UI or enable partial-cost saving.
Order eligibility, draft reconciliation and reviewed saving are later tasks in
[New Order #268](https://github.com/Neuton-AI/Neuton-Back/issues/268).
[T02 #270](https://github.com/Neuton-AI/Neuton-Back/issues/270) tracks rollout.

Roll out the backend projection and migration before switching New Order to
this helper. Reverting these frontend commits restores the previous local read
behavior; keep the server's advanced document revisions in place.
