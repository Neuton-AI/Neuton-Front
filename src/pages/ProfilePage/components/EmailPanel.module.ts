import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import type { LoginMethods } from "@/features/auth/types";
import { ApiError } from "@/lib/api-error";

export function useEmailPanel() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [methods, setMethods] = useState<LoginMethods | null>(null);
  useEffect(() => {
    if (!verifying || !auth.identity) return;
    const controller = new AbortController();
    void authClient
      .methods(auth.identity, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setMethods(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(
            "Unable to load verification methods. Reconnect and try again.",
          );
        }
      });
    return () => controller.abort();
  }, [verifying, auth.identity]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !auth.identity) return;
    setError("");
    const expiresAt = auth.session?.session.recentAuthenticationExpiresAt;
    if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
      setVerifying(true);
      return;
    }
    setBusy(true);
    try {
      await authClient.changeEmail(auth.identity, email);
      setNotice(
        "Check the proposed address for a confirmation link. Your current address remains in use until you confirm. A newer request replaces the previous one.",
      );
      setEmail("");
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "REAUTHENTICATION_REQUIRED"
      ) {
        setVerifying(true);
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "The request was not confirmed. Reconnect and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    currentEmail: auth.user?.email,
    email,
    setEmail,
    notice,
    error,
    busy,
    verifying,
    methods,
    submit,
    verified: () => {
      setVerifying(false);
      setNotice("Identity verified. Review and submit your email change.");
    },
    cancel: () => setVerifying(false),
  };
}
