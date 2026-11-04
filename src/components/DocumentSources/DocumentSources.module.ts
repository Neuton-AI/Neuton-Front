import { beginLocalOperation, isContextAbort } from "@/features/sync/authority";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  signedDownloadOptions,
  useSignedDownloadUrl,
} from "@/features/uploads/uploadsApi";
import type { DocumentSource } from "@/features/uploads/types";

export function useDocumentSource({
  source,
  identity,
  shopId,
}: {
  source: DocumentSource;
  identity: import("@/lib/api-context").AuthIdentity | null;
  shopId: string | null;
}) {
  const queryClient = useQueryClient();
  const displayPath = source.preview?.storagePath ?? source.storagePath;
  const query = useSignedDownloadUrl(identity, shopId, displayPath);
  const [imageFailed, setImageFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const filename = source.originalFilename ?? "document";
  const isPdfLink = !source.preview && source.contentType === "application/pdf";
  const failed = query.isError || imageFailed;

  const pending = useRef<(() => void) | null>(null);
  useEffect(() => {
    setImageFailed(false);
    setOpenFailed(false);
    setOpening(false);
    return () => {
      pending.current?.();
    };
  }, [identity, shopId, source.storagePath]);
  async function openOriginal() {
    if (!identity || !shopId || identity.offline) return;
    const controller = new AbortController();
    let lease: ReturnType<typeof beginLocalOperation>;
    try {
      lease = beginLocalOperation({
        identity,
        shopId,
        signal: controller.signal,
      });
    } catch {
      return;
    }
    const target = window.open("about:blank", "_blank");
    if (target) target.opener = null;
    const cancel = () => {
      controller.abort();
      target?.close();
    };
    lease.signal.addEventListener("abort", cancel, { once: true });
    pending.current = cancel;
    setOpening(true);
    setOpenFailed(false);
    try {
      const { url } = await queryClient.fetchQuery(
        signedDownloadOptions(identity, shopId, source.storagePath),
      );
      lease.assertCurrent();
      if (target) target.location.href = url;
      else {
        window.location.assign(url);
      }
    } catch (error) {
      target?.close();
      if (!isContextAbort(error)) setOpenFailed(true);
    } finally {
      lease.signal.removeEventListener("abort", cancel);
      lease.dispose();
      pending.current = null;
      if (!lease.signal.aborted) setOpening(false);
    }
  }

  return {
    filename,
    isPdfLink,
    failed,
    url: identity?.offline ? undefined : query.data?.url,
    ready: !identity?.offline && Boolean(query.data),
    width: source.preview?.width,
    height: source.preview?.height,
    opening,
    openFailed,
    canOpen: Boolean(identity && shopId && !identity.offline),
    openOriginal,
    handleImageError: () => setImageFailed(true),
  };
}
