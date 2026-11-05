import type React from "react";
import { Button } from "@/components/ui";
import { useState } from "react";
import { authClient } from "@/features/auth/client";

export const AuthSocial: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      window.location.assign(
        await authClient.startGoogle("login", "/dashboard"),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google sign-in failed. Try again.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <div className="mt-6 flex items-center gap-3 text-label text-ink-muted">
        <div className="h-[1px] flex-1 bg-hairline" />
        <span>or continue with</span>
        <div className="h-[1px] flex-1 bg-hairline" />
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          radius="card"
          block
          className="h-[54px] flex-1 text-[16px] font-bold text-ink"
          loading={busy}
          onClick={() => void start()}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          radius="card"
          block
          className="h-[54px] flex-1 text-[16px] font-bold text-ink"
        >
          Apple
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-label">
          {error}
        </p>
      )}
    </>
  );
};
