# Local-first documents (#161)

Receipt, recipe/product and order document screens read from IndexedDB. Scans,
recipe edits, verification and deletion save locally and atomically queue their
domain operations. Pricing, inventory operations and manual order creation keep
their existing server contracts.

`features/sync` owns storage, document adapters, synchronization and feedback.
Data, push/pull queues and scan Blobs are partitioned by JWT subject and shop ID.
Blobs live in their own table; pending work never contains authentication tokens.
The shop membership cache is keyed by user so a previously authenticated PWA can
reopen while offline. Every server request still validates current membership.

The UI refreshes after local commits and pulls, including changes from another
tab. Sync runs on startup, screen entry, focus, reconnect and SSE reconciliation hints.
Web Locks serialize tabs, with an in-process single-flight guard and server retry
receipts protecting retries. Equal revisions do not transfer full documents.
Pending push acknowledgements remove only the transmitted revision. Pulls cannot
overwrite a newer local edit. Deleted server records remain tombstones and cannot
be recreated by an offline patch; other conflicts use millisecond last-write-wins.

Scans use a persistent client request ID through the existing grouped upload
pipeline. A completion retry checks the same upload before sending any files.
Failed work remains queued and other documents can continue synchronizing.
The sync banner provides retry and a JSON export, including binary sources as
data URLs. Quota failures roll back both the local edit and queue mutation and
report that the new change was not saved.

On explicit logout, synced document caches and cached shop memberships are
removed and TanStack Query is cleared. Pending work remains privately scoped to
the original account so it can resume when that account signs in again. Another
account cannot retrieve it through the document adapter. Shared-device users
should export pending work before clearing this site's browser data.

## Rollout and verification

Deploy the companion Neuton-Back change and apply `0028_document_sync.sql` before
the frontend. It adds shop-scoped versions, tombstones and atomic mutation retry
receipts without replacing domain validation or business rules. No new secrets
are required. Native IndexedDB, BroadcastChannel, ResizeObserver and Web Locks
(when available) are used; there is no runtime database dependency.

Run `npm run verify`. Existing screen/API contract tests substitute the transport
adapter; `features/sync/sync.test.ts` exercises real IndexedDB transactions with
fake-indexeddb, including independent connections, storage quota rollback, failed
downloads, equal versions, upload retry identities and edits during an in-flight
push. The backend includes an opt-in disposable-Postgres integration test.

Chrome DevTools verification used `testtest@gmail.com` / `testShop`, a production
PWA build and an isolated migrated Postgres. Offline recipe edits and scans
survived reload. Reconnect pushed the recipe edit; a second-client update pulled
into the open screen. The configured storage CORS policy rejected the temporary
preview origin's scan PUT, so the scan and its Blob correctly stayed queued with
retry/export feedback. Successful upload/retry sequencing is covered by the
automated upload and sync tests; live completion still needs an allowed origin.


## Live sync traffic timing (#192)

Each backend SSE connection batches change hints for 250 ms plus an independently
sampled 0-4 second random delay. Further hints share the pending timer without
restarting it. Initial reconciliation is immediate; change visibility can take up
to roughly 4.25 seconds of server delay plus authorization and document transfer
time, replacing the earlier roughly 1-2 second target for this path.

Heartbeat comments still arrive every 15 seconds, independently of pending hints,
without identity verification or database lookups. Initial and subsequent hints
revalidate session and shop membership; failures close the stream. An expired or
revoked session may receive empty heartbeats until the next authorization check,
but cannot receive an authorized hint or fetch document data after access fails.
Normal sync/document requests retain their existing authorization checks.

SSE reconnect waits use exponential backoff plus random 0-2 second jitter, capped
at 30 seconds overall. Reconciliation resets the backoff; authorization failures
stop reconnecting. The 45-second no-bytes watchdog and disposal cleanup remain.
At the 30-second cap, the specified additive-and-clamped formula no longer spreads
retries; admission control and cross-tab leadership remain deferred to #193.
