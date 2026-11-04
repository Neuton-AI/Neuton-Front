import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { discardLegacyData, hasLegacyData } from "./legacy";

export function LegacyDataNotice() {
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void hasLegacyData()
      .then((found) => {
        if (active.current) setVisible(found);
      })
      .catch(() => {
        if (active.current) {
          setVisible(true);
          setError("Saved data could not be checked. Your data has been kept.");
        }
      });
    return () => {
      active.current = false;
    };
  }, []);
  if (!visible) return null;
  const discard = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await discardLegacyData();
      if (active.current) {
        setVisible(false);
        setConfirming(false);
      }
    } catch (cause) {
      if (active.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Saved data could not be discarded.",
        );
      }
    } finally {
      if (active.current) setBusy(false);
    }
  };
  return (
    <>
      <aside
        aria-label="Previous offline data"
        className="border-b border-hairline bg-surface-cream p-4 text-sm text-ink"
      >
        <p>
          Offline work from the previous sign-in system is kept separate. It
          will not sync to this account.
        </p>
        <button
          type="button"
          disabled={busy}
          className="min-h-10 underline disabled:opacity-45"
          onClick={() => setConfirming(true)}
        >
          Discard old saved data
        </button>
        {error && <p role="alert">{error}</p>}
      </aside>
      <ConfirmDialog
        open={confirming}
        title="Discard old saved data?"
        description="This permanently removes unsent documents, scans and changes from the previous sign-in system on this device. Your current account's saved work is kept."
        confirmLabel={busy ? "Discarding…" : "Discard old data"}
        onConfirm={() => {
          void discard();
        }}
        onCancel={() => {
          if (!busy) setConfirming(false);
        }}
      />
    </>
  );
}
