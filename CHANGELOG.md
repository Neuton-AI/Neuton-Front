# Changelog

## Unreleased
### Added
- New orders derive prices and totals from the synced catalog, retain selections through recipe changes, and preserve server review corrections while local data catches up.
- Order forms accept required customer/address, independent delivery dates and final delivery fees, including zero.
- API errors retain bounded server details for reviewed-order recovery while preserving their status, code and trace metadata.
- Local recipe pricing supports complete and partial legacy snapshots during the synced order-pricing rollout without extra pricing requests.

### Changed
- Order creation sends reviewed prices, date and final fee through a typed request and does not automatically retry or resume an offline save.
### Fixed
- Pending recipe cost edits invalidate old order-pricing projections until sync
  supplies current costs.
