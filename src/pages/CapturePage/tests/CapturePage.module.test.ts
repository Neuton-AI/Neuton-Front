import { authState, resetAuth } from "@/test/auth";
import { makeFile, renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCapturePage } from "../CapturePage.module";

const boundary = vi.hoisted(() => ({ upload: vi.fn(), navigate: vi.fn() }));
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
vi.mock("@/features/sync/documentsApi", () => ({ saveScan: boundary.upload }));
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => boundary.navigate,
}));
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn<() => Promise<MediaStream>>();
const photo = (name = "photo.jpg") => makeFile(name, "image/jpeg");
beforeEach(() => {
  resetAuth();
  boundary.upload.mockReset().mockResolvedValue({});
  boundary.navigate.mockReset();
  stop.mockReset();
  getUserMedia.mockReset().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
});

describe("capture collection", () => {
  it("counts the current preview, adds it once, and retakes only the current capture", async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() => result.current.onPick([photo("first.jpg")]));
    expect(result.current.total).toBe(1);
    expect(result.current.stacked).toHaveLength(0);
    await act(async () => {
      await Promise.all([
        result.current.addCurrent(),
        result.current.addCurrent(),
      ]);
    });
    expect(result.current.current).toBeNull();
    expect(result.current.stacked).toHaveLength(1);
    act(() => result.current.retake());
    expect(result.current.total).toBe(1);
    act(() => result.current.onPick([photo("second.jpg")]));
    act(() => result.current.retake());
    expect(result.current.current).toBeNull();
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "first.jpg",
    ]);
  });
  it("holds Add locked until the shrink finishes, then restores live camera", async () => {
    let finish!: () => void;
    const cancel = vi.fn();
    const animate = vi.fn().mockReturnValue({
      finished: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      cancel,
    });
    const { result } = renderHookWithProviders(() => useCapturePage());
    const element = document.createElement("div");
    element.animate = animate;
    Object.defineProperty(result.current.previewRef, "current", {
      value: element,
    });
    act(() => result.current.onPick([photo()]));
    let transition!: Promise<void>;
    act(() => {
      transition = result.current.addCurrent();
    });
    expect(result.current.adding).toBe(true);
    act(() => {
      void result.current.addCurrent();
      result.current.onPick([photo("extra.jpg")]);
    });
    expect(result.current.total).toBe(1);
    expect(animate).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await transition;
    });
    expect(result.current.adding).toBe(false);
    expect(result.current.current).toBeNull();
    expect(result.current.stacked).toHaveLength(1);
    expect(cancel).toHaveBeenCalled();
  });
  it("caps every append at four, keeps valid selections and frees capacity on deletion", async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() =>
      result.current.onPick([
        photo("1"),
        photo("2"),
        photo("3"),
        photo("4"),
        photo("5"),
      ]),
    );
    expect(result.current.total).toBe(4);
    expect(result.current.current?.file.name).toBe("4");
    expect(result.current.error).toMatch(/4/);
    await act(async () => result.current.addCurrent());
    expect(result.current.stacked).toHaveLength(3);
    act(() => result.current.onPick([photo("6")]));
    expect(result.current.total).toBe(4);
    act(() => result.current.deleteSource(result.current.stacked[1].id));
    act(() => result.current.onPick([photo("7")]));
    expect(result.current.total).toBe(4);
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "1",
      "3",
      "4",
    ]);
  });
  it("reviews every source from the stack, including the current fourth source", () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() =>
      result.current.onPick([
        photo("camera.jpg"),
        makeFile("upload.pdf", "application/pdf"),
        photo("gallery.png"),
        photo("current.jpg"),
      ]),
    );
    act(() => result.current.openReview());
    expect(
      result.current.reviewSources.map((source) => source.file.name),
    ).toEqual(["camera.jpg", "upload.pdf", "gallery.png", "current.jpg"]);
    act(() => result.current.setReviewIndex(3));
    act(() => result.current.moveSource(result.current.current!.id, -1));
    expect(result.current.reviewIndex).toBe(2);
    expect(result.current.reviewSources[2].file.name).toBe("current.jpg");
    act(() => result.current.deleteSource(result.current.current!.id));
    expect(result.current.current).toBeNull();
    expect(result.current.reviewSources).toHaveLength(3);
    expect(result.current.reviewIndex).toBe(2);
  });
  it("deletes saved carousel photos while retaining the current preview in review", () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() =>
      result.current.onPick([
        photo("1"),
        photo("2"),
        photo("3"),
        photo("current"),
      ]),
    );
    act(() => result.current.openReview());
    act(() => result.current.setReviewIndex(1));
    act(() => result.current.deleteSource(result.current.stacked[1].id));
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "1",
      "3",
    ]);
    expect(result.current.reviewIndex).toBe(1);
    act(() => result.current.deleteSource(result.current.stacked[0].id));
    expect(result.current.reviewIndex).toBe(1);
    act(() => result.current.deleteSource(result.current.stacked[0].id));
    expect(result.current.reviewIndex).toBe(0);
    expect(result.current.current?.file.name).toBe("current");
    expect(result.current.total).toBe(1);
  });
  it("closes an empty review, reorders and replaces only the chosen source, and preserves picker cancellation", async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() => result.current.onPick([photo("1"), photo("2")]));
    await act(async () => result.current.addCurrent());
    act(() => result.current.moveSource(result.current.stacked[1].id, -1));
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "2",
      "1",
    ]);
    act(() => result.current.replaceSource(result.current.stacked[0].id));
    act(() => result.current.onPick(undefined));
    expect(result.current.total).toBe(2);
    act(() =>
      result.current.onPick([makeFile("replacement.pdf", "application/pdf")]),
    );
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "replacement.pdf",
      "1",
    ]);
    expect(result.current.stacked[0].previewUrl).toBeNull();
    act(() => result.current.openReview());
    act(() => result.current.closeReview());
    expect(result.current.total).toBe(2);
    act(() => result.current.deleteSource(result.current.stacked[0].id));
    act(() => result.current.deleteSource(result.current.stacked[0].id));
    expect(result.current.reviewIndex).toBeNull();
    expect(result.current.current).toBeNull();
    expect(result.current.total).toBe(0);
  });
  it("rejects invalid/oversized files, locks document kind during collection, and releases URLs", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const { result, unmount } = renderHookWithProviders(
      () => useCapturePage(),
      { route: "/capture?kind=bad" },
    );
    expect(result.current.kind).toBe("receipt");
    act(() =>
      result.current.onPick([makeFile("script.js", "text/javascript")]),
    );
    expect(result.current.total).toBe(0);
    const oversized = photo();
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
    act(() => result.current.onPick([oversized]));
    expect(result.current.total).toBe(0);
    act(() => result.current.setKind("order"));
    act(() => result.current.onPick([photo()]));
    const url = result.current.current!.previewUrl;
    act(() => result.current.setKind("recipe"));
    expect(result.current.kind).toBe("order");
    act(() => result.current.retake());
    expect(revoke).toHaveBeenCalledWith(url);
    unmount();
  });
  it("captures a ready camera frame and prevents duplicate in-flight camera callbacks", async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    let blobCallback!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        blobCallback = callback;
      },
    );
    const { result } = renderHookWithProviders(() => useCapturePage());
    const video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    Object.defineProperty(result.current.videoRef, "current", { value: video });
    act(() => {
      result.current.handleShutter();
      result.current.handleShutter();
    });
    await waitFor(() => expect(drawImage).toHaveBeenCalledOnce());
    await act(async () =>
      blobCallback(new Blob(["frame"], { type: "image/jpeg" })),
    );
    expect(result.current.current?.file.name).toBe("capture.jpg");
    expect(result.current.total).toBe(1);
  });
  it.each(["receipt", "recipe", "product", "order"])(
    "sends %s sources in order exactly once including current",
    async (kind) => {
      const { result } = renderHookWithProviders(() => useCapturePage(), {
        route: `/capture?kind=${kind}&orderId=00000000-0000-4000-8000-000000000001`,
      });
      const files = [
        photo("1"),
        photo("2"),
        photo("3"),
        makeFile("4.pdf", "application/pdf"),
      ];
      act(() => result.current.onPick(files));
      await act(async () => {
        await Promise.all([result.current.submit(), result.current.submit()]);
      });
      expect(boundary.upload).toHaveBeenCalledOnce();
      expect(boundary.upload).toHaveBeenCalledWith(
        files,
        kind,
        { token: "token-1", shopId: "shop-1" },
        "00000000-0000-4000-8000-000000000001",
      );
      expect(boundary.navigate).toHaveBeenCalled();
    },
  );
  it("retains failed upload state for retry and refuses unauthenticated submissions", async () => {
    authState.token = null;
    const { result, rerender } = renderHookWithProviders(() =>
      useCapturePage(),
    );
    act(() => result.current.onPick([photo()]));
    await act(async () => result.current.submit());
    expect(boundary.upload).not.toHaveBeenCalled();
    authState.token = "token-1";
    rerender();
    boundary.upload.mockRejectedValueOnce(new Error("Source 1 failed"));
    await act(async () => result.current.submit());
    expect(result.current.error).toBe("Source 1 failed");
    expect(result.current.busy).toBe(false);
    expect(result.current.total).toBe(1);
    await act(async () => result.current.submit());
    expect(boundary.upload).toHaveBeenCalledTimes(2);
  });
  it("stops a camera resolving after unmount", async () => {
    let resolve!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = renderHookWithProviders(() => useCapturePage());
    unmount();
    await act(async () => resolve(stream));
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });
  it("reorders the current preview in full review and sends the displayed order", async () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    const first = photo("first");
    const second = photo("second");
    act(() => result.current.onPick([first, second]));
    act(() => result.current.openCurrentReview());
    expect(result.current.reviewSources.map((source) => source.file)).toEqual([
      first,
      second,
    ]);
    act(() => result.current.moveSource(result.current.current!.id, -1));
    expect(result.current.reviewIndex).toBe(0);
    expect(result.current.reviewSources.map((source) => source.file)).toEqual([
      second,
      first,
    ]);
    await act(async () => result.current.submit());
    expect(boundary.upload).toHaveBeenCalledWith(
      [second, first],
      "receipt",
      expect.anything(),
      undefined,
    );
  });
  it("native picker cancellation exits replacement mode", () => {
    const { result } = renderHookWithProviders(() => useCapturePage());
    act(() => result.current.onPick([photo("first"), photo("current")]));
    act(() => result.current.replaceSource(result.current.stacked[0].id));
    act(() => result.current.cancelPick());
    act(() => result.current.onPick([photo("new")]));
    expect(result.current.stacked.map((source) => source.file.name)).toEqual([
      "first",
      "current",
    ]);
    expect(result.current.total).toBe(3);
  });
  it("rejects targetless order submission before creating any upload", async () => {
    const { result } = renderHookWithProviders(() => useCapturePage(), {
      route: "/capture?kind=order",
    });
    act(() => result.current.onPick([photo()]));
    await act(async () => result.current.submit());
    expect(result.current.error).toMatch(/from an order/);
    expect(boundary.upload).not.toHaveBeenCalled();
  });
});
