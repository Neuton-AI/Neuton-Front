import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import {
  readActionSecret,
  clearActionSecret,
} from "@/features/auth/action-fragment";
import { broadcastAuthEvent } from "@/features/auth/tab-events";
import { ApiError } from "@/lib/api-error";
import type { LoginMethods } from "@/features/auth/types";

export function useEmailChangeReady() {
  return !useAuth().loading;
}
export function useConfirmEmailChange() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [secret, setSecret] = useState(readActionSecret);
  const [owner] = useState(auth.identity?.userId);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [methods, setMethods] = useState<LoginMethods | null>(null);
  useEffect(() => () => clearActionSecret(), []);
  useEffect(() => {
    if (owner && owner !== auth.identity?.userId) {
      setSecret(null);
      clearActionSecret();
      setError(
        "The account changed. Sign in to the requesting account and reopen the email link.",
      );
    }
  }, [owner, auth.identity?.userId]);
  async function verify() {
    if (!auth.identity) return;
    try {
      setMethods(await authClient.methods(auth.identity));
      setVerifying(true);
    } catch {
      setError("Unable to load verification methods. Reconnect and try again.");
    }
  }
  async function submit() {
    if (!secret || !auth.identity || busy) return;
    setBusy(true);
    setError("");
    try {
      await authClient.confirmEmailChange(auth.identity, secret);
      setSecret(null);
      clearActionSecret();
      setDone(true);
      // Retain only a non-secret outcome before authority refresh can remount routing.
      navigate("/signin", { replace: true, state: { emailChanged: true } });
      broadcastAuthEvent("logged-out");
      await auth.refresh().catch(() => undefined);
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "REAUTHENTICATION_REQUIRED"
      ) {
        setError(
          "Verify your identity, then review and confirm this change again.",
        );
        await verify();
      } else {
        setSecret(null);
        clearActionSecret();
        let message =
          "The email change was not confirmed. Reopen the email link or request a new change from your profile.";
        if (cause instanceof ApiError && cause.code === "INVALID_ACTION") {
          message =
            "This link is invalid or expired. Request a new email change from your profile.";
        }
        if (cause instanceof ApiError && cause.code === "EMAIL_UNAVAILABLE") {
          message =
            "This contact email is unavailable. Request a change to a different address.";
        }
        if (cause instanceof ApiError && cause.code === "ACCOUNT_CHANGED") {
          message =
            "Sign in to the account that requested the change, then reopen the email link.";
        }
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }
  return {
    ready: !!auth.identity,
    email: auth.user?.email,
    secret,
    busy,
    done,
    error,
    verifying,
    methods,
    submit,
    verified: () => {
      setVerifying(false);
      setError("Identity verified. Review and confirm your email change.");
    },
    cancel: () => setVerifying(false),
  };
}
