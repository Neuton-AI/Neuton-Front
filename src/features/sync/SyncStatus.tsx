import { SyncPopup } from './SyncPopup';
import { useSyncStatus } from './SyncStatus.module';

export function SyncStatus() {
  const status = useSyncStatus();
  if (!status) return null;
  return <SyncPopup {...status} />;
}
