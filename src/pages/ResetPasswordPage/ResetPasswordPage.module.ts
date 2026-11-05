import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import {
  clearActionSecret,
  readActionSecret,
} from "@/features/auth/action-fragment";

export function useResetPasswordPage() {
  const auth = useAuth();
  const [secret, setSecret] = useState(readActionSecret);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => clearActionSecret(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !secret) return;
    if (
      password !== confirmation ||
      Array.from(password).length < 15 ||
      Array.from(password).length > 128
    ) {
      setError("Enter matching passwords containing 15–128 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authClient.resetPassword(secret, password);
      setDone(true);
      await auth.refresh().catch(() => undefined);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Reset was not confirmed. Try signing in or request a new link.",
      );
    } finally {
      setPassword("");
      setConfirmation("");
      setSecret(null);
      clearActionSecret();
      setBusy(false);
    }
  }
  return {
    secret,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    busy,
    done,
    error,
    submit,
  };
}
