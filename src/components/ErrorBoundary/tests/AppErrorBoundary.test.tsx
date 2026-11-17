import { AppErrorBoundary } from "@/components/ErrorBoundary/AppErrorBoundary";
import { redactFaroPageUrl } from "@/components/ErrorBoundary/reportRenderError";
import { renderWithRouter } from "@/test/render";
import { TransportItemType } from "@grafana/faro-web-sdk";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const telemetry = vi.hoisted(() => ({ api: undefined as { pushError: ReturnType<typeof vi.fn> } | undefined }));

vi.mock("@grafana/faro-web-sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@grafana/faro-web-sdk")>()),
  faro: telemetry,
}));

function BrokenPage(): never {
  throw new Error("private email and token", { cause: "private shop" });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  telemetry.api = { pushError: vi.fn() };
});

afterEach(() => vi.restoreAllMocks());

describe("AppErrorBoundary", () => {
  it("renders the fallback and reports safe route and component details", () => {
    renderWithRouter(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>, {
      route: "/catalog/recipes/private-shop?token=private-token#private-email",
    });

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    const pushError = telemetry.api!.pushError;
    expect(pushError).toHaveBeenCalledOnce();
    const [[error, options]] = pushError.mock.calls;
    expect(error.message).toBe("React render failed");
    expect(error.cause).toBeUndefined();
    expect(options.context).toEqual({
      route: "/catalog/recipes/:id",
      componentStack: expect.stringContaining("at BrokenPage"),
      environment: "test",
      version: expect.any(String),
    });
    expect(options.context.componentStack).not.toContain(".tsx:");
    expect(JSON.stringify(options)).not.toContain("private-");
    expect(redactFaroPageUrl({
      type: TransportItemType.EXCEPTION,
      payload: { type: options.type, value: error.message, timestamp: "0" },
      meta: {
        app: { name: "Neuton-Front" },
        page: { url: "https://example.test/catalog/recipes/private-shop?token=private-token" },
      },
    }).meta).toEqual({
      app: { name: "Neuton-Front" },
      page: { url: "https://example.test/catalog/recipes/:id" },
    });
  });

  it("uses the fallback when a lazy chunk rejects and Faro is unavailable", async () => {
    telemetry.api = undefined;
    const BrokenChunk = lazy(() => Promise.reject(new Error("Loading chunk failed")));
    renderWithRouter(
      <AppErrorBoundary>
        <Suspense fallback={<p>Loading</p>}>
          <BrokenChunk />
        </Suspense>
      </AppErrorBoundary>,
    );

    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  });

  it("recovers when the dashboard link changes routes", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AppErrorBoundary>
        <Routes>
          <Route path="/orders" element={<BrokenPage />} />
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </AppErrorBoundary>,
      { route: "/orders" },
    );

    await user.click(screen.getByRole("link", { name: "Back to Dashboard" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(telemetry.api!.pushError).toHaveBeenCalledOnce();
  });
});
