import { Button } from "@/components/ui";
import { useSessionsPanel } from "./SessionsPanel.module";

export function SessionsPanel() {
  const { devices, busy, error, retry, revoke } = useSessionsPanel();
  return (
    <section
      className="mt-4 rounded-card bg-surface-card p-4"
      aria-labelledby="devices-title"
      aria-busy={busy}
    >
      <h2 id="devices-title" className="eyebrow">
        Your devices
      </h2>
      <p className="my-2 text-label text-ink-muted">
        Review where you are signed in. Saved unsent work stays on its original
        device.
      </p>
      {error && (
        <p role="alert" className="my-3 text-label">
          {error}
        </p>
      )}
      {!devices && !error && <p role="status">Loading devices…</p>}
      {!devices && error && <Button onClick={retry}>Retry</Button>}
      <ul className="divide-y divide-hairline">
        {devices?.map((device) => (
          <li
            key={device.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words text-body">
                {device.device || "Unknown browser"}
              </p>
              {device.current && (
                <p className="text-label font-medium">This device</p>
              )}
              <p className="text-label text-ink-muted">
                Last active {new Date(device.lastActivityAt).toLocaleString()}
              </p>
            </div>
            <Button
              disabled={busy}
              aria-label={`Sign out ${device.device || "Unknown browser"}`}
              onClick={() => void revoke(device)}
            >
              Sign out
            </Button>
          </li>
        ))}
      </ul>
      <Button disabled={busy || !devices} onClick={() => void revoke()}>
        Sign out all devices
      </Button>
    </section>
  );
}
