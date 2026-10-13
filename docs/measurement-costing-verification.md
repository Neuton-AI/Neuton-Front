# Issue 136 UI verification

Issue: https://github.com/Neuton-AI/Neuton-Back/issues/136

## Result

Receipt, recipe, inventory and order views distinguish a matched product from a usable measurement/price basis. Unknown values display as an em dash. Known subtotals remain labeled as subtotals. Correction controls retain evidence and offer explicit recipe/ingredient/product scope; successful saves invalidate the dependent queries.

The paired backend migration and API must be deployed first. See the backend's `docs/measurement-costing-verification.md` for the financial rollout, legacy reconciliation and precision contract.

## Automated checks

`npm run verify`: 221 tests passed across 21 files; lint, type check and production build passed. Three existing Fast Refresh warnings remain; zero lint errors. Regressions cover pending purchase corrections, exact string codes and multipacks, deferred correction conflicts without losing inputs, shared product contents, incomplete recipe cost, unknown monthly profit and unknown saved-order margin.

## Chrome DevTools checks

The prescribed test account and testShop were used. Application writes went only to private local PostgreSQL; the Israeli fixtures use ILS. The remote membership remains USD, so quote/recipe/order currency is taken from the API calculation or saved order.

Committed screenshots in `visual-proof/n136-measurement-costing`:

- `ready.png`: 50g butter from a 250g/10 ILS purchase costs 2 ILS and can be priced.
- `unresolved.png`: contradictory public cheddar package metadata remains unusable despite a product link. The shop-scoped 200g confirmation then produced an estimated 6.225 ILS cost for 50g, without stock.
- `receipt.jpg`: after reviewing the actual supplied scan, 1000g cornstarch is applied at .014 ILS/g, lemons use 925g and the actual 9.16 ILS paid, and margarine remains pending without contents. Source OCR dates/names are not guaranteed correct.

A pending butter purchase was resolved to 500g; a repeat application returned 409 and the balance stayed 750g. Browser quote returned 2 ILS for the 50g butter recipe. The source brownie shows nine ingredients, explicit grams, quarter-teaspoons, count eggs and yield 16; missing stock/price links and unresolved alternatives keep cost incomplete. The order form required a manual price, showed 10 ILS total, and kept production cost/profit unknown. The saved order retained these values. Its initially misleading 0% margin badge was corrected to an em dash and regression-tested.

## Limits

Actual Gemini calls on both supplied images were approved by the user. Brownie extraction was correct; receipt OCR required human corrections and misread the date. No quoted source established the brownie volume convention, so guessed conventions are rejected. Valid code enrichment is covered by backend fixtures; a live Carrefour lookup supplied no usable package evidence. Live coverage for every barcode and R2/Redis upload transport were not verified. Approved extraction results were run through the actual worker handlers with isolated local dependencies.

Final inventory and saved-order screenshot requests timed out in automatic tool approval review. Earlier Chrome snapshots, committed screenshots, API checks and database tests provide the recorded evidence; no replacement screenshot was fabricated. The last margin correction is verified by the regression test.
