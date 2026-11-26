import { restoreSession } from "@/features/auth/auth";
import { ProfilePage } from "@/pages/ProfilePage/ProfilePage";
import { buildShop } from "@/test/factories/shops.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
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
  offeredRole: "admin", createdAt: "2026-01-01T00:00:00.000Z", readAt: "2026-01-02T00:00:00.000Z" as string | null,
};
const activeShopKey = "neuton.activeShopId";

async function openInbox(hasShop = false, route = "/profile/invites") {
  const sessionId = crypto.randomUUID();
  const memberships = hasShop ? [{ shop: existingShop, role: "owner" }] : [];
  const expires = new Date(Date.now() + 60_000).toISOString();
  server.use(
    http.get(apiPath("/session"), () => HttpResponse.json({
      user: account, memberships,
      session: { id: sessionId, idleExpiresAt: expires, absoluteExpiresAt: expires, nextRenewalAt: expires },
    })),
    http.post(apiPath("/auth/csrf"), () => HttpResponse.json({ token: "invite-proof" })),
    http.get(apiPath("/auth/sessions"), () => HttpResponse.json({ sessions: [] })),
  );
  await restoreSession();
  renderWithRouter(
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/invites" element={<ShopInvitesPage />} />
      <Route path="/dashboard" element={<h1>Shop dashboard</h1>} />
    </Routes>,
    { route },
  );
  return { user: userEvent.setup(), memberships, sessionId };
}

it("shows unread invites in Profile and marks only the unread invitations shown in the inbox", async () => {
  const first = { ...invitation, id: "unread-1", shopName: "New Shop", readAt: null };
  const late = { ...invitation, id: "unread-2", shopName: "Late Shop", readAt: null };
  const pending = [invitation, first];
  const batches: string[][] = [];
  server.use(
    http.get(apiPath(inbox), () => HttpResponse.json({ invitations: pending })),
    http.post(apiPath(`${inbox}/read`), async ({ request }) => {
      const { invitationIds } = await request.json() as { invitationIds: string[] };
      batches.push(invitationIds);
      expect(request.headers.get("x-csrf-token")).toBe("invite-proof");
      expect(request.headers.has("x-shop-id")).toBe(false);
      expect(screen.getByRole("heading", { name: "New Shop" })).toBeVisible();
      for (const row of pending) {
        if (invitationIds.includes(row.id)) row.readAt = "2026-01-02T00:00:00.000Z";
      }
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const { user } = await openInbox(false, "/profile");
  const invites = await screen.findByRole("link", { name: "My Invites 1 new invitation" });
  expect(batches).toEqual([]);
  await user.click(invites);
  await waitFor(() => expect(batches).toEqual([[first.id]]));
  await user.click(screen.getByRole("link", { name: "Back to Profile" }));
  expect(await screen.findByRole("link", { name: "My Invites" })).toBeVisible();

  pending.push(late);
  await user.click(screen.getByRole("tab", { name: "shop" }));
  await user.click(screen.getByRole("tab", { name: "me" }));
  await user.click(await screen.findByRole("link", { name: "My Invites 1 new invitation" }));
  await waitFor(() => expect(batches).toEqual([[first.id], [late.id]]));
});

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
