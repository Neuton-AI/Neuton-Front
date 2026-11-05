import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth";
import { authClient } from "@/features/auth/client";
import type { DeviceSession } from "@/features/auth/types";
import { broadcastAuthEvent } from "@/features/auth/tab-events";

export function useSessionsPanel() {
  const { identity, logout, logoutAll } = useAuth();
  const [devices, setDevices] = useState<DeviceSession[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    setDevices(null);
    setError(null);
    void authClient
      .devices(identity, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDevices(result.sessions);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Unable to load devices. Try again when connected.");
        }
      });
    return () => controller.abort();
  }, [identity, attempt]);
  async function revoke(device?: DeviceSession) {
    if (!identity || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!device) await logoutAll();
      else if (device.current) await logout();
      else {
        await authClient.revokeDevice(device.id, identity);
        broadcastAuthEvent("membership-refresh");
        setDevices(
          (previous) => previous?.filter((row) => row.id !== device.id) ?? null,
        );
      }
    } catch {
      setError("Sign-out was not confirmed. Reconnect and try again.");
    } finally {
      setBusy(false);
    }
  }
  return {
    devices,
    busy,
    error,
    retry: () => setAttempt((value) => value + 1),
    revoke,
  };
}
