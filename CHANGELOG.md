# Changelog

## Unreleased
### Added
- New Order refreshes changed prices and availability after a save conflict and asks the user to review and save again.
- New Order shows unavailable selections and price changes, and asks before saving with exclusions.
- New Order has a searchable local recipe picker with previews and keyboard selection.
- New orders use a compact details form, centered item counters, saved-draft discard confirmation, and a sticky Save order footer.
- Saved order details show known delivery dates and partial-cost provenance, using the saved fee and server profit without reconstructing distance charges.
- New orders derive prices and totals from the synced catalog, retain selections through recipe changes, and preserve server review corrections while local data catches up.
- Order forms accept required customer/address, independent delivery dates and final delivery fees, including zero.
- API errors retain bounded server details for reviewed-order recovery while preserving their status, code and trace metadata.
- Local recipe pricing supports complete and partial legacy snapshots during the synced order-pricing rollout without extra pricing requests.

### Changed
- Shop settings use one default delivery fee, including zero and cent amounts, instead of distance-based rates.
- Order creation sends reviewed prices, date and final fee through a typed request and does not automatically retry or resume an offline save.
### Fixed
- New Order keeps Add item above the sticky footer after selection and shows full line totals on narrow screens.
- Pending recipe cost edits invalidate old order-pricing projections until sync
  supplies current costs.
