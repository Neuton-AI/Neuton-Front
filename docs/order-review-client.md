# Order review client contracts

`ApiError.details` preserves bounded JSON diagnostics from nested error envelopes and compatible flat-message responses. Invalid or oversized details are omitted while status, code, message, trace and existing session behavior remain available. The transport does not interpret those diagnostics as instructions or automatically resubmit a review conflict.

The transport accepts at most 2,000 value nodes, nesting depth five, 100 entries per array, 20 fields per object, 64 characters per key and 512 characters per string. Order-specific consumers must validate the domain shape before applying corrections to a draft.
