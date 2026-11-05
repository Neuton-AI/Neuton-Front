import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { GoogleCompletePage } from "./GoogleCompletePage";

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  auth: {
    loading: false,
    status: "anonymous",
    session: null,
    refresh: vi.fn(),
  },
}));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/auth/google-completion", () => ({
  completeCapturedGoogle: mocks.complete,
}));

it("offers a safe restart after a collision without automatically redirecting", async () => {
  mocks.complete.mockRejectedValueOnce(
    new Error(
      "Sign in with your existing method, then link Google in account settings.",
    ),
  );
  render(
    <MemoryRouter>
      <GoogleCompletePage />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("existing method");
  expect(
    screen.getByRole("link", { name: "Return to sign in" }),
  ).toHaveAttribute("href", "/signin");
});

it("routes a completed pending account to confirmation after restoring the session", async () => {
  mocks.complete.mockResolvedValueOnce({
    returnPath: "/dashboard",
    purpose: "login",
  });
  mocks.auth.refresh.mockImplementation(async () => {
    Object.assign(mocks.auth, {
      status: "pending-email",
      session: { user: { status: "pending_email" }, memberships: [] },
    });
  });
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<GoogleCompletePage />} />
        <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
        <Route path="/auth/confirm" element={<p>Confirmation destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("Confirmation destination"),
  ).toBeInTheDocument();
});
