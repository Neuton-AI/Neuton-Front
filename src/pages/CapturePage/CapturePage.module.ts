import { useAuth, useShopMemberships } from "@/features/auth/supabase";
import { type MediaKind } from "@/features/uploads/types";
import {
  MAX_UPLOAD_SOURCES,
  uploadSources,
  validateUploadFiles,
  type UploadSession,
} from "@/features/uploads/upload";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CAMERA_VIDEO_CONSTRAINTS, capturePhoto } from "./cameraCapture";
import { enableContinuousFocus, focusAtPoint } from "./cameraFocus";

export type CaptureSource = {
  id: string;
  file: File;
  previewUrl: string | null;
};
type Collection = { sources: CaptureSource[]; currentId: string | null };

export function useCapturePage() {
  const { user, token } = useAuth();
  const { activeShopId } = useShopMemberships(user?.id);
  const [params] = useSearchParams();
  const orderId = params.get("orderId") ?? undefined;
  const navigate = useNavigate();
  const [kind, updateKind] = useState<MediaKind>(
    ["receipt", "recipe", "product", "order"].includes(params.get("kind") ?? "")
      ? (params.get("kind") as MediaKind)
      : "receipt",
  );
  const [collection, setCollection] = useState<Collection>({
    sources: [],
    currentId: null,
  });
  const collectionRef = useRef(collection);
  const updateCollection = (next: Collection) => {
    collectionRef.current = next;
    setCollection(next);
  };
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const capturingRef = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const captureVersion = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const autofocus = useRef<Promise<void>>(Promise.resolve());
  const focusPending = useRef(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewIncludesCurrent, setReviewIncludesCurrent] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const replaceId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const alive = useRef(true);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const inputs = [
      fileInputRef.current,
      galleryInputRef.current,
      nativeCameraInputRef.current,
    ];
    const cancel = () => {
      replaceId.current = null;
    };
    inputs.forEach((input) => input?.addEventListener("cancel", cancel));
    return () =>
      inputs.forEach((input) => input?.removeEventListener("cancel", cancel));
  }, []);
  const current =
    collection.sources.find((source) => source.id === collection.currentId) ??
    null;
  const stacked = collection.sources.filter(
    (source) => source.id !== collection.currentId,
  );
  const total = collection.sources.length;
  const reviewSources = reviewIncludesCurrent ? collection.sources : stacked;
  const locked = busy || adding || capturing || uploadSession !== null;
  const editingLocked = () =>
    busyRef.current ||
    addingRef.current ||
    capturingRef.current ||
    uploadSession !== null;

  useEffect(() => {
    alive.current = true;
    const ownedUrls = urls.current;
    return () => {
      alive.current = false;
      captureVersion.current += 1;
      animationRef.current?.cancel();
      ownedUrls.forEach((url) => URL.revokeObjectURL(url));
      ownedUrls.clear();
    };
  }, []);
  useEffect(() => {
    const retained = new Set(
      collection.sources.map((source) => source.previewUrl),
    );
    urls.current.forEach((url) => {
      if (!retained.has(url)) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
    });
  }, [collection]);
  useEffect(() => {
    if (current || total >= MAX_UPLOAD_SOURCES) return;
    let stream: MediaStream | null = null;
    let active = true;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: CAMERA_VIDEO_CONSTRAINTS,
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamRef.current = stream;
        const track = stream.getVideoTracks?.()[0];
        if (track) autofocus.current = enableContinuousFocus(track);
      } catch {
        if (active)
          setError(
            "Camera access denied or unavailable. You can still upload files.",
          );
      }
    })();
    return () => {
      active = false;
      captureVersion.current += 1;
      streamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [current, total]);

  const makeSource = (file: File): CaptureSource => {
    const previewUrl = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
      ? URL.createObjectURL(file)
      : null;
    if (previewUrl) urls.current.add(previewUrl);
    return { id: crypto.randomUUID(), file, previewUrl };
  };
  const onPick = (picked: FileList | readonly File[] | undefined | null) => {
    if (
      !picked?.length ||
      busyRef.current ||
      addingRef.current ||
      uploadSession
    )
      return;
    captureVersion.current += 1;
    const files = Array.from(picked);
    const previous = collectionRef.current;
    const replacing = replaceId.current;
    replaceId.current = null;
    if (replacing) {
      const validation = validateUploadFiles([files[0]]);
      if (validation) {
        setError(validation);
        return;
      }
      const replacement = makeSource(files[0]);
      updateCollection({
        sources: previous.sources.map((source) =>
          source.id === replacing ? replacement : source,
        ),
        currentId:
          previous.currentId === replacing
            ? replacement.id
            : previous.currentId,
      });
      setError(null);
      return;
    }
    const accepted: CaptureSource[] = [];
    let failure: string | null = null;
    for (const file of files) {
      const validation = validateUploadFiles([
        ...previous.sources.map((source) => source.file),
        ...accepted.map((source) => source.file),
        file,
      ]);
      if (validation) {
        failure = validation;
        continue;
      }
      accepted.push(makeSource(file));
    }
    if (accepted.length)
      updateCollection({
        sources: [...previous.sources, ...accepted],
        currentId: accepted[accepted.length - 1].id,
      });
    setError(failure);
  };
  const handleShutter = async () => {
    if (locked || current || capturingRef.current) return;
    if (collectionRef.current.sources.length >= MAX_UPLOAD_SOURCES) {
      setError(
        "You can include up to 4 files or photos. Remove one to add another.",
      );
      return;
    }
    const video = videoRef.current;
    if (
      !video ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    )
      return;
    capturingRef.current = true;
    setCapturing(true);
    const version = captureVersion.current;
    try {
      const photo = await capturePhoto(video);
      if (
        photo &&
        alive.current &&
        version === captureVersion.current &&
        !busyRef.current &&
        !addingRef.current
      )
        onPick([photo]);
    } catch {
      if (alive.current && version === captureVersion.current)
        setError("Could not take a photo. Try again or use your phone camera.");
    } finally {
      capturingRef.current = false;
      if (alive.current) setCapturing(false);
    }
  };
  const handleFocus = async (clientX: number, clientY: number) => {
    const video = videoRef.current;
    const stream = streamRef.current;
    const track = stream?.getVideoTracks?.()[0];
    if (!video || !track || current || editingLocked() || focusPending.current)
      return;
    focusPending.current = true;
    try {
      await autofocus.current;
      if (streamRef.current === stream)
        await focusAtPoint(track, video, clientX, clientY);
    } catch {
      /* Unsupported and rejected focus remain silent. */
    } finally {
      focusPending.current = false;
    }
  };
  const addCurrent = async (instant = false) => {
    if (
      editingLocked() ||
      !collectionRef.current.currentId ||
      total >= MAX_UPLOAD_SOURCES
    )
      return;
    addingRef.current = true;
    setAdding(true);
    const id = collectionRef.current.currentId;
    const element = previewRef.current;
    try {
      if (element?.animate && !instant) {
        const reduce = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const bounds = element.getBoundingClientRect();
        const animation = element.animate(
          reduce
            ? [{ opacity: 1 }, { opacity: 0.35 }]
            : [
                { transform: "translate(0, 0) scale(1)", opacity: 1 },
                {
                  transform: `translate(10px, 12px) scale(${52 / (bounds.width || 358)}, ${68 / (bounds.height || 370)})`,
                  opacity: 0.7,
                },
              ],
          {
            duration: reduce ? 160 : 240,
            easing:
              getComputedStyle(element)
                .getPropertyValue("--ease-in-out")
                .trim() || "cubic-bezier(0.77, 0, 0.175, 1)",
            fill: "forwards",
          },
        );
        animationRef.current = animation;
        await animation.finished;
      }
      if (alive.current && collectionRef.current.currentId === id)
        updateCollection({ ...collectionRef.current, currentId: null });
    } catch {
      /* Cancellation on navigation leaves the collection intact. */
    } finally {
      animationRef.current?.cancel();
      animationRef.current = null;
      addingRef.current = false;
      if (alive.current) setAdding(false);
    }
  };
  const retake = () => {
    if (editingLocked() || !collectionRef.current.currentId) return;
    const previous = collectionRef.current;
    updateCollection({
      sources: previous.sources.filter(
        (source) => source.id !== previous.currentId,
      ),
      currentId: null,
    });
    setError(null);
  };
  const deleteSource = (id: string) => {
    if (editingLocked()) return;
    const previous = collectionRef.current;
    const sources = previous.sources.filter((source) => source.id !== id);
    const nextCurrent = previous.currentId === id ? null : previous.currentId;
    const remainingStack = reviewIncludesCurrent
      ? sources
      : sources.filter((source) => source.id !== nextCurrent);
    updateCollection({ sources, currentId: nextCurrent });
    setReviewIndex((index) =>
      !remainingStack.length
        ? null
        : index === null
          ? null
          : Math.min(index, remainingStack.length - 1),
    );
    setError(null);
  };
  const moveSource = (id: string, direction: -1 | 1) => {
    if (editingLocked()) return;
    const previous = collectionRef.current;
    const sources = [...previous.sources];
    const index = sources.findIndex((source) => source.id === id);
    const stack = reviewIncludesCurrent
      ? sources
      : sources.filter((source) => source.id !== previous.currentId);
    const stackIndex = stack.findIndex((source) => source.id === id);
    const neighbor = stack[stackIndex + direction];
    if (index < 0 || !neighbor) return;
    const nextIndex = sources.findIndex((source) => source.id === neighbor.id);
    [sources[index], sources[nextIndex]] = [sources[nextIndex], sources[index]];
    updateCollection({ ...previous, sources });
    setReviewIndex(
      (reviewIncludesCurrent
        ? sources
        : sources.filter((source) => source.id !== previous.currentId)
      ).findIndex((source) => source.id === id),
    );
  };
  const chooseSource = (source: "gallery" | "file" | "camera") => {
    if (editingLocked()) return;
    if (!replaceId.current && total >= MAX_UPLOAD_SOURCES) {
      setError(
        "You can include up to 4 files or photos. Remove one to add another.",
      );
      return;
    }
    setSourcePickerOpen(false);
    const input =
      source === "gallery"
        ? galleryInputRef.current
        : source === "camera"
          ? nativeCameraInputRef.current
          : fileInputRef.current;
    if (input) {
      input.value = "";
      input.click();
    }
  };
  const submit = async () => {
    if (
      !collectionRef.current.sources.length ||
      !token ||
      !activeShopId ||
      busyRef.current ||
      addingRef.current ||
      capturingRef.current
    )
      return;
    if (kind === "order" && !orderId) {
      setError("Open this capture from an order to attach its document.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await uploadSources(
        collectionRef.current.sources.map((source) => source.file),
        kind,
        {
          context: { token, shopId: activeShopId },
          session: uploadSession,
          onProgress: setUploadSession,
          orderId,
        },
      );
      navigate(kind === "receipt" ? "/catalog?tab=receipts" : "/catalog");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Upload failed. Try again.",
      );
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return {
    kind,
    setKind: (next: MediaKind) => {
      if (!collectionRef.current.sources.length && !editingLocked())
        updateKind(next);
    },
    current,
    stacked,
    total,
    adding,
    busy,
    capturing,
    locked,
    error,
    uploadSession,
    progress: uploadSession,
    videoRef,
    previewRef,
    fileInputRef,
    galleryInputRef,
    nativeCameraInputRef,
    handleShutter,
    handleFocus,
    onPick,
    retake,
    addCurrent,
    submit,
    cancelPick: () => {
      replaceId.current = null;
    },
    sourcePickerOpen,
    handleBrowse: () => {
      if (!editingLocked()) {
        replaceId.current = null;
        setSourcePickerOpen(true);
      }
    },
    closeSourcePicker: () => {
      setSourcePickerOpen(false);
      replaceId.current = null;
    },
    chooseSource,
    replaceSource: (id: string) => {
      if (!editingLocked()) {
        replaceId.current = id;
        setSourcePickerOpen(true);
      }
    },
    reviewIndex,
    reviewSources,
    setReviewIndex,
    openReview: () => {
      if (stacked.length && !busy && !adding) {
        setReviewIncludesCurrent(false);
        setReviewIndex(0);
      }
    },
    openCurrentReview: () => {
      if (current && !busy && !adding) {
        setReviewIncludesCurrent(true);
        setReviewIndex(
          collection.sources.findIndex((source) => source.id === current.id),
        );
      }
    },
    closeReview: () => setReviewIndex(null),
    deleteSource,
    moveSource,
    handleClose: () => navigate(-1),
  };
}
export type CapturePageModel = ReturnType<typeof useCapturePage>;
