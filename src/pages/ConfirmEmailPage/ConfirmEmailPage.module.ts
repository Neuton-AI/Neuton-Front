import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import {
  clearActionSecret,
  readActionSecret,
} from "@/features/auth/action-fragment";

import type { FormEvent } from "react";

export function useConfirmEmailPage() {
  const auth = useAuth();
  const [secret, setSecret] = useState(readActionSecret);
  const [enteredEmail, setEmail] = useState<string | null>(null);
  const accountEmail = auth.user?.email ?? "";
  const email = enteredEmail ?? accountEmail;
  useEffect(() => () => clearActionSecret(), []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to complete this request. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = () =>
    run(async () => {
      if (!secret) return;
      await authClient.confirm(secret);
      clearActionSecret();
      setSecret(null);
      setNotice("Email confirmed. Sign in to continue.");
      await auth.refresh().catch(() => undefined);
    });
  const resend = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await authClient.resend(email);
      setNotice("If confirmation is available, an email is on its way.");
    });
  };
  const forget = () => {
    clearActionSecret();
    setSecret(null);
  };
  const signOut = () => run(auth.logout);
  return {
    auth,
    secret,
    email,
    setEmail,
    busy,
    notice,
    error,
    confirm,
    resend,
    forget,
    signOut,
  };
}
