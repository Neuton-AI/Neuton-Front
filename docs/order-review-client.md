# Order review client contracts

`ApiError.details` preserves bounded JSON diagnostics from nested error envelopes and compatible flat-message responses. Invalid or oversized details are omitted while status, code, message, trace and existing session behavior remain available. The transport does not interpret those diagnostics as instructions or automatically resubmit a review conflict.

The transport accepts at most 2,000 value nodes, nesting depth five, 100 entries per array, 20 fields per object, 64 characters per key and 512 characters per string. Order-specific consumers must validate the domain shape before applying corrections to a draft.

The order-specific `orderReviewDetails` helper accepts only ORDER_REVIEW_REQUIRED HTTP 409 errors with bounded UUIDs, names, two-decimal prices, availability reasons and boolean provenance. It requires authoritative current items and consistent price-change/current-item pairs. Malformed corrections stay ordinary API errors; NO_AVAILABLE_ITEMS remains a separate code/message path. The helper does not apply corrections or resubmit an order.
