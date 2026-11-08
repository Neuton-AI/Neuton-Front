import { InlineNotice } from '@/components/feedback';
import { useSessionDevices } from './SessionDevices.module';

export function SessionDevices({ signOutEverywhere }: { signOutEverywhere: () => Promise<void> }) {
  const { open, setOpen, devices, pending, error, refresh, setRefresh, end } = useSessionDevices();
  return <section className="mt-5 rounded-card border border-hairline p-4" aria-label="Device sessions">
    <button type="button" className="pressable" aria-expanded={open} onClick={() => setOpen(!open)}>
      Manage sessions
    </button>
    {open && <div className="mt-3 grid gap-3" aria-busy={pending}>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {error && <button type="button" onClick={() => setRefresh(refresh + 1)}>Refresh sessions</button>}
      <ul className="grid gap-3">
        {devices.map((device) => <li key={device.id} className="flex items-center justify-between gap-4">
          <div>
            <p>{device.deviceLabel || (device.current ? 'This session' : 'Another session')}</p>
            <p className="text-ink-muted">Last active {new Date(device.lastActivityAt).toLocaleString()}</p>
          </div>
          <button type="button" className="pressable" disabled={pending} onClick={() => void end(device.id)}>End session</button>
        </li>)}
      </ul>
      <button type="button" className="pressable justify-self-start" disabled={pending} onClick={() => void signOutEverywhere()}>
        Sign out everywhere
      </button>
    </div>}
  </section>;
}
