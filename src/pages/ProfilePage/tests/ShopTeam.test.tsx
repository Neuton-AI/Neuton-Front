import { authState, resetAuth } from "@/test/auth";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it, vi } from "vitest";
import { ProfilePage } from "../ProfilePage";

vi.mock("@/features/auth/auth", async () => (await import("@/test/auth")).authMock);
beforeEach(resetAuth);

const team = "/shop/team";
const invite = {
  id: "invite-1", recipientId: "candidate", fullName: "Dana Levin", email: "dana@example.test",
  offeredRole: "admin", createdAt: "2026-11-26T00:00:00Z",
};

it("opens Team from Profile Shop and sends and cancels an invitation", async () => {
  let pending = false;
  server.use(
    http.get(apiPath(`${team}/members`), ({ request }) => {
      expect(request.headers.get("x-shop-id")).toBe("shop-1");
      return HttpResponse.json({ members: [
        { id: "membership-1", fullName: "Maya Cohen", email: "maya@example.test", role: "member" },
      ] });
    }),
    http.get(apiPath(`${team}/invitations`), () => HttpResponse.json({ invitations: pending ? [invite] : [] })),
    http.post(apiPath(`${team}/accounts/search`), () => HttpResponse.json({
      accounts: [{ id: "candidate", fullName: invite.fullName, email: invite.email, eligibility: "eligible" }],
      page: 1, pageCount: 1,
    })),
    http.post(apiPath(`${team}/invitations`), async ({ request }) => {
      expect(request.headers.get("x-shop-id")).toBe("shop-1");
      expect(await request.json()).toEqual({ recipientId: "candidate", offeredRole: "admin" });
      pending = true;
      return HttpResponse.json({ invitation: invite }, { status: 201 });
    }),
    http.delete(apiPath(`${team}/invitations/invite-1`), ({ request }) => {
      expect(request.headers.get("x-shop-id")).toBe("shop-1");
      pending = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const user = userEvent.setup();
  renderWithRouter(<ProfilePage />, { route: "/profile" });
  await user.click(screen.getByRole("tab", { name: "shop" }));
  await user.click(await screen.findByRole("link", { name: "Team" }));
  expect(await screen.findByRole("heading", { name: "Team" })).toBeInTheDocument();
  expect(await screen.findByText("maya@example.test")).toBeInTheDocument();
  expect(await screen.findByText("No pending invitations")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Invite teammate" }));
  const picker = screen.getByRole("dialog", { name: "Invite teammate" });
  await user.type(within(picker).getByRole("searchbox"), "Dana");
  await user.click(await within(picker).findByRole("button", { name: "Dana Levin dana@example.test" }));
  await user.click(within(picker).getByRole("radio", { name: "Admin" }));
  await user.click(within(picker).getByRole("button", { name: "Send invite" }));
  expect(await screen.findByText("Invitation sent to Dana Levin")).toBeInTheDocument();
  const pendingList = await screen.findByRole("list", { name: "Pending invitations" });
  expect(within(pendingList).getByText("Invited as Admin")).toBeInTheDocument();
  await user.click(within(pendingList).getByRole("button", { name: /cancel invitation/i }));
  expect(await screen.findByText("No pending invitations")).toBeInTheDocument();
  expect(screen.queryByText("dana@example.test")).toBeNull();
  await user.click(screen.getByRole("link", { name: "Shop" }));
  expect(await screen.findByRole("tab", { name: "shop" })).toHaveAttribute("aria-selected", "true");
});

it.each(["admin", "member"] as const)("keeps Team hidden from a shop %s, including direct navigation", async (role) => {
  authState.role = role;
  const roster = vi.fn(() => HttpResponse.json({ members: [] }));
  server.use(http.get(apiPath(`${team}/members`), roster));
  renderWithRouter(<ProfilePage />, { route: "/profile?tab=shop&view=team" });
  await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Target profit margin" })).toBeInTheDocument());
  expect(screen.queryByRole("link", { name: "Team" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Team" })).toBeNull();
  expect(roster).not.toHaveBeenCalled();
});

it("refreshes the roster and pending list when an invitation was already accepted", async () => {
  let accepted = false;
  server.use(
    http.get(apiPath(`${team}/members`), () => HttpResponse.json({ members: accepted ? [
      { id: "membership-dana", fullName: invite.fullName, email: invite.email, role: "admin" },
    ] : [] })),
    http.get(apiPath(`${team}/invitations`), () => HttpResponse.json({ invitations: accepted ? [] : [invite] })),
    http.delete(apiPath(`${team}/invitations/invite-1`), () => {
      accepted = true;
      return HttpResponse.json({ error: { message: "Already resolved" } }, { status: 409 });
    }),
  );
  renderWithRouter(<ProfilePage />, { route: "/profile?tab=shop&view=team" });
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /cancel invitation/i }));
  expect(await screen.findByText("This invitation is no longer pending.")).toBeInTheDocument();
  expect(screen.getByText("No pending invitations")).toBeInTheDocument();
  expect(within(screen.getByRole("list", { name: "Team members" })).getByText(invite.email)).toBeInTheDocument();
});

it("lets an owner promote and downgrade a teammate in the selected shop", async () => {
  const member = { id: "maya-membership", fullName: "Maya Cohen", email: "maya@example.test", role: "member" };
  server.use(
    http.get(apiPath(`${team}/members`), () => HttpResponse.json({ members: [member] })),
    http.get(apiPath(`${team}/invitations`), () => HttpResponse.json({ invitations: [] })),
    http.patch(apiPath(`${team}/members/${member.id}`), async ({ request }) => {
      expect(request.headers.get("x-shop-id")).toBe("shop-1");
      const { role } = await request.json() as { role: string };
      member.role = role;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const user = userEvent.setup();
  renderWithRouter(<ProfilePage />, { route: "/profile?tab=shop&view=team" });
  const actions = await screen.findByRole("button", { name: "Actions for Maya Cohen" });
  await user.click(actions);
  await user.click(screen.getByRole("button", { name: "Promote to Admin" }));
  expect(await screen.findByText("Maya Cohen is now an Admin.")).toBeVisible();
  expect(actions.closest("li")).toHaveTextContent("Admin");
  await user.click(actions);
  await user.click(screen.getByRole("button", { name: "Downgrade to Member" }));
  expect(await screen.findByText("Maya Cohen is now a Member.")).toBeVisible();
  expect(actions.closest("li")).toHaveTextContent("Member");
});

it("keeps access when removal is canceled and revokes it after explicit confirmation", async () => {
  const member = { id: "maya-membership", fullName: "Maya Cohen", email: "maya@example.test", role: "admin" };
  let removed = false;
  const remove = vi.fn(({ request }: { request: Request }) => {
    expect(request.headers.get("x-shop-id")).toBe("shop-1");
    removed = true;
    return new HttpResponse(null, { status: 204 });
  });
  server.use(
    http.get(apiPath(`${team}/members`), () => HttpResponse.json({ members: removed ? [] : [member] })),
    http.get(apiPath(`${team}/invitations`), () => HttpResponse.json({ invitations: [] })),
    http.delete(apiPath(`${team}/members/${member.id}`), remove),
  );
  const user = userEvent.setup();
  renderWithRouter(<ProfilePage />, { route: "/profile?tab=shop&view=team" });
  const actions = await screen.findByRole("button", { name: "Actions for Maya Cohen" });
  await user.click(actions);
  await user.click(screen.getByRole("button", { name: "Remove access" }));
  let confirm = await screen.findByRole("dialog", { name: "Remove Maya Cohen?" });
  const cancel = within(confirm).getByRole("button", { name: "Cancel" });
  expect(cancel).toHaveFocus();
  await user.click(cancel);
  expect(actions).toHaveFocus();
  expect(remove).not.toHaveBeenCalled();

  await user.click(actions);
  await user.click(screen.getByRole("button", { name: "Remove access" }));
  confirm = await screen.findByRole("dialog", { name: "Remove Maya Cohen?" });
  await user.click(within(confirm).getByRole("button", { name: "Remove access" }));
  expect(await screen.findByText("Access removed for Maya Cohen.")).toBeVisible();
  expect(screen.getByText("No team members yet")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Team members" })).toHaveFocus();
  expect(remove).toHaveBeenCalledOnce();
});
