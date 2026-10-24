# Receipt merchant review

Receipt cards and detail headings use Unknown merchant when the merchant name
is absent, empty, or whitespace-only. Available receipt dates and totals identify
the receipt; missing dates are labeled Date unavailable, missing totals show a
dash, and known zero totals remain zero. The original filename appears in details.

Owners and admins can save a merchant correction on extracted or verified
receipts. The field trims surrounding whitespace and requires 1–200 characters.
Saving uses local document persistence and the existing sync queue, then refreshes
receipt detail and catalog queries. The receipt's verification state is unchanged.

Deploy the backend PATCH /api/v1/receipts/:id support with this frontend change.
The endpoint enforces ownership, roles, reviewable lifecycle states, and plain-text
input. Existing sync status/error UI reports queued writes and server rejections.

Regression tests cover missing/blank merchant names, zero/missing totals, saving
a correction, and retained review status. Chrome DevTools checks use isolated
in-memory fixtures to verify fallback, filename visibility, and corrected titles
in both detail and catalog; backend HTTP tests verify persistence and rejection
paths separately.

Implements Neuton-Front #176.
