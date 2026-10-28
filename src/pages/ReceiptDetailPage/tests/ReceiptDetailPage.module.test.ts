import { authState, resetAuth } from "@/test/auth";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it, vi } from "vitest";
import { useReceiptDetailPage } from "../ReceiptDetailPage.module";
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useParams: () => ({ id: "rc-1" }),
}));
beforeEach(resetAuth);
it("submits all accepted line IDs and exposes rejected verification", async () => {
  let body: unknown;
  server.use(
    http.post(apiPath("/receipts/rc-1/verify"), async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(
        { error: { message: "Review rejected" } },
        { status: 409 },
      );
    }),
  );
  const { result } = renderHookWithProviders(() => useReceiptDetailPage());
  await waitFor(() => expect(result.current.receipt).not.toBeNull());
  await act(() => result.current.verify());
  expect(body).toEqual({ items: [{ id: "li-1", accepted: true }] });
  expect(result.current.verifyError).toBe("Review rejected");
});
it("rejects member verification without requesting a write", async () => {
  authState.role = "member";
  const { result } = renderHookWithProviders(() => useReceiptDetailPage());
  await waitFor(() => expect(result.current.receipt).not.toBeNull());
  await act(() => result.current.verify());
  expect(result.current.canVerify).toBe(false);
  expect(result.current.verifyError).toBeNull();
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
