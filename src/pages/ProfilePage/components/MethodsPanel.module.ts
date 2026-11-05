import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import { replaceBrowserSession } from "@/features/auth/replace-browser-session";
import type { LoginMethods } from "@/features/auth/types";

export function useMethodsPanel() {
  const auth = useAuth();
  const location = useLocation();
  const [methods, setMethods] = useState<LoginMethods | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() =>
    (location.state as { googleVerified?: boolean } | null)?.googleVerified
      ? "Google identity verified. Review and submit your sign-in method change."
      : "",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!auth.identity) return;
    const controller = new AbortController();
    setMethods(null);
    setError("");
    void authClient
      .methods(auth.identity, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setMethods(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Unable to load sign-in methods. Reconnect and try again.");
      });
    return () => controller.abort();
  }, [auth.identity, attempt]);

  async function link() {
    if (!auth.identity || busy || !methods) return;
    if (!methods.capabilities.linkGoogle) {
      setVerifying(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      window.location.assign(
        await authClient.startGoogle("link", "/profile", auth.identity),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google linking could not start.",
      );
      setBusy(false);
    }
  }
  async function change(kind: "add" | "unlink", event?: FormEvent) {
    event?.preventDefault();
    if (!auth.identity || busy || !methods) return;
    const allowed =
      kind === "add"
        ? methods.capabilities.addPassword
        : methods.capabilities.unlinkGoogle;
    if (!allowed) {
      setVerifying(true);
      return;
    }
    const identity = auth.identity;
    const submitted = password;
    setPassword("");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await replaceBrowserSession(auth, () =>
        kind === "add"
          ? authClient.addPassword(identity, submitted)
          : authClient.unlinkGoogle(identity),
      );
      setNotice(
        kind === "add"
          ? "Password added. Your other sessions have been signed out."
          : "Google unlinked. Your other sessions have been signed out.",
      );
      setAttempt((value) => value + 1);
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Reconnect and try again.";
      setError(`The method change was not confirmed. ${detail}`);
    } finally {
      setBusy(false);
    }
  }
  function verified() {
    setVerifying(false);
    setNotice(
      "Identity verified. Review and submit your sign-in method change.",
    );
    setAttempt((value) => value + 1);
  }
  return {
    methods,
    error,
    notice,
    busy,
    password,
    setPassword,
    verifying,
    link,
    change,
    verified,
    retry: () => setAttempt((value) => value + 1),
    verify: () => {
      setPassword("");
      setVerifying(true);
    },
    cancelVerification: () => setVerifying(false),
  };
}
