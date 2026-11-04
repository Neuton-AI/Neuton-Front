import { useState } from "react";
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

  async function openOriginal() {
    const target = window.open("about:blank", "_blank");
    if (target) target.opener = null;
    setOpening(true);
    setOpenFailed(false);
    try {
      const { url } = await queryClient.fetchQuery(
        signedDownloadOptions(identity, shopId, source.storagePath),
      );
      if (target) target.location.href = url;
      else window.location.assign(url);
    } catch {
      target?.close();
      setOpenFailed(true);
    } finally {
      setOpening(false);
    }
  }

  return {
    filename,
    isPdfLink,
    failed,
    url: query.data?.url,
    ready: Boolean(query.data),
    width: source.preview?.width,
    height: source.preview?.height,
    opening,
    openFailed,
    canOpen: Boolean(identity && shopId),
    openOriginal,
    handleImageError: () => setImageFailed(true),
  };
}
