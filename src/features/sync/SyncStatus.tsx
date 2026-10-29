import type React from "react";
import { SyncPopup } from "./SyncPopup";
import { useSyncStatus } from "./SyncStatus.module";
import { SyncConflicts } from "./SyncConflicts";

export const SyncStatus: React.FC = () => {
  const status = useSyncStatus();
  return (
    <>
      <SyncConflicts />
      {status ? <SyncPopup {...status} /> : null}
    </>
  );
};
