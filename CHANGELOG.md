# Changelog

## Unreleased
### Added
- API errors retain bounded server details for reviewed-order recovery while preserving their status, code and trace metadata.
- Local recipe pricing supports complete and partial legacy snapshots during the synced order-pricing rollout without extra pricing requests.

### Changed
- Order creation sends reviewed prices, date and final fee through a typed request and does not automatically retry or resume an offline save.
### Fixed
- Pending recipe cost edits invalidate old order-pricing projections until sync
  supplies current costs.
