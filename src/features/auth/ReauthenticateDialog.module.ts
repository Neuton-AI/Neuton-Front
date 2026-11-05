import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./useAuth";
import { authClient } from "./client";
import { replaceBrowserSession } from "./replace-browser-session";

export function useReauthenticateDialog(onVerified: () => void) {
  const auth = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      mounted.current = false;
      dialog?.close();
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !auth.identity) return;
    const identity = auth.identity;
    const proof = password;
    setPassword("");
    setBusy(true);
    setError("");
    try {
      await replaceBrowserSession(auth, () =>
        authClient.reauthenticate(identity, proof),
      );
      if (mounted.current) onVerified();
    } catch (cause) {
      if (mounted.current) {
        const detail =
          cause instanceof Error ? cause.message : "Please try again.";
        setError(
          `Verification was not confirmed. ${detail} Sign in again if your session expired.`,
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function google() {
    if (busy || !auth.identity) return;
    setPassword("");
    setBusy(true);
    setError("");
    try {
      window.location.assign(
        await authClient.startGoogle(
          "reauthenticate",
          "/profile",
          auth.identity,
        ),
      );
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Google verification could not start.",
        );
        setBusy(false);
      }
    }
  }
  return { dialogRef, password, setPassword, busy, error, submit, google };
}
