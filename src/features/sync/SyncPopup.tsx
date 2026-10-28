import type React from "react";
import { type Ref } from "react";
import { Link } from "react-router-dom";
import type { SyncError } from "./errors";
import { useSyncPopup } from "./SyncPopup.module";
interface ISyncPopup {
  rootRef?: Ref<HTMLElement>;
  tone: "error" | "success";
  title: string;
  message: string;
  errors: SyncError[];
  pending: number;
  processing: number;
  online: boolean;
  opened: boolean;
  setOpened: (update: (value: boolean) => boolean) => void;
  retry: () => void;
  exportPending: () => Promise<void>;
  onSignIn: () => void;
}

export const SyncPopup: React.FC<ISyncPopup> = ({
  rootRef,
  tone,
  title,
  message,
  errors,
  opened,
  setOpened,
  retry,
  exportPending,
  onSignIn,
}) => {
  const popup = useSyncPopup({
    title,
    message,
    errors,
    retry,
    exportPending,
    onSignIn,
  });
  const {
    index,
    setIndex,
    selected,
    text,
    context,
    recoveryPath,
    recover,
    recoveryLabel,
  } = popup;
  return (
    <aside
      ref={rootRef}
      className={`sync-popup sync-popup--${tone}`}
      aria-label="Sync status"
    >
      <button
        type="button"
        className={`sync-popup__pill ${opened ? "sync-popup__pill--opened" : ""}`}
        aria-expanded={opened}
        aria-label={text}
        onClick={() => setOpened((value) => !value)}
      >
        <span className="sync-popup__disc" aria-hidden="true">
          {tone === "error" ? (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3.5v8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="10" cy="16" r="1.7" fill="currentColor" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
              <path
                d="m4.5 10.5 4 4 7-8.5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        {opened && (
          <>
            <strong>{context}</strong>
            <span className="sync-popup__message">{text}</span>
          </>
        )}
        {!opened && errors.length > 1 && (
          <span className="sync-popup__count">{errors.length}</span>
        )}
      </button>
      <span className="sr-only" role="status">
        {text}
      </span>
      {opened && selected && (
        <div className="sync-popup__actions">
          {errors.length > 1 && (
            <button
              aria-label="Next issue"
              onClick={() => setIndex((value) => value + 1)}
            >
              {(index % errors.length) + 1}/{errors.length}
            </button>
          )}
          {selected.sourceIndex != null && (
            <span>File {selected.sourceIndex + 1}</span>
          )}
          {selected.savedLocally === false && <span>Change unsaved</span>}
          {recoveryPath &&
          ["request-access", "review-document", "resolve-conflict"].includes(
            selected.recovery,
          ) ? (
            <Link to={recoveryPath}>{recoveryLabel}</Link>
          ) : (
            <button onClick={recover}>{recoveryLabel}</button>
          )}
        </div>
      )}
    </aside>
  );
};
