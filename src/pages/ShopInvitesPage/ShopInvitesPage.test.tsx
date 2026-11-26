import { restoreSession } from "@/features/auth/auth";
import { buildShop } from "@/test/factories/shops.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { expect, it } from "vitest";
import { ShopInvitesPage } from "./ShopInvitesPage";

const inbox = "/shop-invitations";
const account = { id: "invitee", email: "invitee@example.test", fullName: null, avatarUrl: null };
const invitedShop = buildShop({ id: "invited-shop", name: "North & Grain" });
const existingShop = buildShop({ id: "existing-shop", name: "Current Shop" });
const invitation = {
  id: "invitation-1", shopId: invitedShop.id, shopName: invitedShop.name,
  offeredRole: "admin", createdAt: "2026-01-01T00:00:00.000Z", readAt: null,
};
const activeShopKey = "neuton.activeShopId";

async function openInbox(hasShop = false) {
  const sessionId = crypto.randomUUID();
  const memberships = hasShop ? [{ shop: existingShop, role: "owner" }] : [];
  const expires = new Date(Date.now() + 60_000).toISOString();
  server.use(
    http.get(apiPath("/session"), () => HttpResponse.json({
      user: account, memberships,
      session: { id: sessionId, idleExpiresAt: expires, absoluteExpiresAt: expires, nextRenewalAt: expires },
    })),
    http.post(apiPath("/auth/csrf"), () => HttpResponse.json({ token: "invite-proof" })),
  );
  await restoreSession();
  renderWithRouter(
    <Routes>
      <Route path="/profile/invites" element={<ShopInvitesPage />} />
      <Route path="/dashboard" element={<h1>Shop dashboard</h1>} />
    </Routes>,
    { route: "/profile/invites" },
  );
  return { user: userEvent.setup(), memberships, sessionId };
}

it.each([false, true])("accepts an invitation and waits for Open shop (existing shop: %s)", async (hasShop) => {
  let pending = true;
  server.use(http.get(apiPath(inbox), ({ request }) => {
    expect(request.headers.has("x-shop-id")).toBe(false);
    return HttpResponse.json({ invitations: pending ? [invitation] : [] });
  }));
  const { user, memberships, sessionId } = await openInbox(hasShop);
  server.use(http.post(apiPath(`${inbox}/${invitation.id}/accept`), ({ request }) => {
    expect(request.headers.has("x-shop-id")).toBe(false);
    expect(request.headers.get("x-session-id")).toBe(sessionId);
    expect(request.headers.get("x-csrf-token")).toBe("invite-proof");
    expect(request.body).toBeNull();
    pending = false;
    memberships.push({ shop: invitedShop, role: "admin" });
    return HttpResponse.json({ membership: { shopId: invitedShop.id, role: "admin" } });
  }));
  expect(await screen.findByText(invitedShop.name)).toBeVisible();
  expect(screen.getByText("Admin")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Accept" }));
  const openShop = await screen.findByRole("button", { name: "Open shop" });
  expect(openShop).toBeEnabled();
  expect(screen.getByRole("heading", { name: "My Invites" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  if (hasShop) expect(localStorage.getItem(activeShopKey)).toBe(existingShop.id);
  await user.click(openShop);
  expect(await screen.findByRole("heading", { name: "Shop dashboard" })).toBeVisible();
  expect(localStorage.getItem(activeShopKey)).toBe(invitedShop.id);
});

it.each([204, 404, 409])("refreshes the inbox after a decline response (%s)", async (status) => {
  let pending = true;
  server.use(
    http.get(apiPath(inbox), () => HttpResponse.json({ invitations: pending ? [invitation] : [] })),
    http.post(apiPath(`${inbox}/${invitation.id}/decline`), () => {
      pending = false;
      return new HttpResponse(null, { status });
    }),
  );
  const { user } = await openInbox();
  await user.click(await screen.findByRole("button", { name: "Decline" }));
  const notice = status === 204 ? "Invitation declined." : "This invitation is no longer pending.";
  expect(await screen.findByText(notice)).toBeVisible();
  expect(screen.getByText("No pending invitations")).toBeVisible();
  expect(localStorage.getItem(activeShopKey)).toBeNull();
});

it("reconciles a lost response without replaying the decision", async () => {
  let finish!: () => void;
  const response = new Promise<void>((resolve) => { finish = resolve; });
  let pending = true;
  let writes = 0;
  server.use(
    http.get(apiPath(inbox), () => HttpResponse.json({ invitations: pending ? [invitation] : [] })),
    http.post(apiPath(`${inbox}/${invitation.id}/accept`), async () => {
      writes++;
      await response;
      pending = false;
      return HttpResponse.error();
    }),
  );
  const { user } = await openInbox();
  await user.click(await screen.findByRole("button", { name: "Accept" }));
  expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  finish();
  expect(await screen.findByText(/Couldn’t confirm your response/)).toBeVisible();
  expect(screen.getByText("No pending invitations")).toBeVisible();
  expect(writes).toBe(1);
});

it("shows a loading state, a retryable error, and then the empty inbox", async () => {
  let fail!: () => void;
  const firstResponse = new Promise<void>((resolve) => { fail = resolve; });
  let attempts = 0;
  server.use(http.get(apiPath(inbox), async () => {
    attempts++;
    if (attempts === 1) {
      await firstResponse;
      return new HttpResponse(null, { status: 503 });
    }
    return HttpResponse.json({ invitations: [] });
  }));
  const { user } = await openInbox();
  expect(screen.getByText("Loading invitations…")).toBeInTheDocument();
  expect(screen.queryByText("No pending invitations")).toBeNull();
  fail();
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load invitations.");
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("No pending invitations")).toBeVisible();
});
