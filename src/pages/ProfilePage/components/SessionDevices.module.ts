import { useEffect, useState } from 'react';
import { endSession, listSessions, type DeviceSession } from '@/features/auth/auth';


export function useSessionDevices() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPending(true);
    setError(undefined);
    void listSessions(controller.signal)
      .then((sessions) => { if (!controller.signal.aborted) setDevices(sessions); })
      .catch(() => { if (!controller.signal.aborted) setError('Sessions could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [open, refresh]);

  async function end(id: string) {
    setPending(true);
    setError(undefined);
    try {
      await endSession(id);
      setDevices((previous) => previous.filter((device) => device.id !== id));
    } catch {
      setError('Ending this session could not be confirmed.');
    } finally {
      setPending(false);
    }
  }

  return { open, setOpen, devices, pending, error, refresh, setRefresh, end };
}
