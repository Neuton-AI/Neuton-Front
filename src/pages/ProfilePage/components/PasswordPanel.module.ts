import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import { replaceBrowserSession } from "@/features/auth/replace-browser-session";

export function usePasswordPanel() {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verifying, setVerifying] = useState(false);
  function startVerification() {
    setCurrentPassword("");
    setNewPassword("");
    setNotice("");
    setError("");
    setVerifying(true);
  }
  function verified() {
    setVerifying(false);
    setNotice(
      "Identity verified. Continue changing your password, then submit when ready.",
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !auth.identity) return;
    const identity = auth.identity;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await replaceBrowserSession(auth, () =>
        authClient.changePassword(identity, currentPassword, newPassword),
      );
      setNotice("Password changed. Your other sessions have been signed out.");
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Please try again.";
      setError(
        `Password change was not confirmed. ${detail} Sign in again if your session expired.`,
      );
    } finally {
      setCurrentPassword("");
      setNewPassword("");
      setBusy(false);
    }
  }
  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    busy,
    error,
    notice,
    submit,
    verifying,
    startVerification,
    verified,
    cancelVerification: () => setVerifying(false),
  };
}
