import { useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/features/auth/client";

export function useRecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await authClient.recover(email);
      setNotice(
        "If password recovery is available for that address, an email is on its way.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to send recovery email. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { email, setEmail, busy, notice, error, submit };
}
