# Order review client contracts

`ApiError.details` preserves bounded JSON diagnostics from nested error envelopes and compatible flat-message responses. Invalid or oversized details are omitted while status, code, message, trace and existing session behavior remain available. The transport does not interpret those diagnostics as instructions or automatically resubmit a review conflict.

The transport accepts at most 2,000 value nodes, nesting depth five, 100 entries per array, 20 fields per object, 64 characters per key and 512 characters per string. Order-specific consumers must validate the domain shape before applying corrections to a draft.

The order-specific `orderReviewDetails` helper accepts only ORDER_REVIEW_REQUIRED HTTP 409 errors with bounded UUIDs, names, two-decimal prices, availability reasons and boolean provenance. It requires authoritative current items and consistent price-change/current-item pairs. Malformed corrections stay ordinary API errors; NO_AVAILABLE_ITEMS remains a separate code/message path. The helper does not apply corrections or resubmit an order.


`ReviewedCreateOrderBody` carries the required customer/address/date, final delivery fee, expected prices and confirmed exclusions. Expected prices are distinct from legacy overrides. Read models allow unknown legacy date/completeness snapshots. The existing caller retains its temporary legacy request type until the draft/form migration and T17 retirement.

Create uses explicit `retry: false` and `networkMode: 'always'`: the transport either completes online or returns an error, rather than retaining a paused mutation that resumes on reconnection. This preserves the existing ordinary request/session behavior while preventing inherited mutation-retry defaults from resubmitting an order. Success still invalidates order/dashboard caches. See the official [mutation retry options](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation) and [network-mode behavior](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode).
