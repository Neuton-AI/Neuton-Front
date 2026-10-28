import type React from "react";
import { SyncPopup } from "./SyncPopup";
import { useSyncStatus } from "./SyncStatus.module";

export const SyncStatus: React.FC = () => {
  const status = useSyncStatus();
  if (!status) return null;
  return <SyncPopup {...status} />;
};
