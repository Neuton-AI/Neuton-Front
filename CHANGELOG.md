# Changelog

## Unreleased
### Added
- API errors retain bounded server details for reviewed-order recovery while preserving their status, code and trace metadata.

### Changed
- Order creation sends reviewed prices, date and final fee through a typed request and does not automatically retry or resume an offline save.
