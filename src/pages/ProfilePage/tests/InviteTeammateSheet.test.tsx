import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { InviteTeammateSheet } from "../components/ShopTeam/InviteTeammateSheet";

const path = "/shop/team/accounts/search";
const props = {
  userId: "user-1", shopId: "shop-1", shopName: "Neuton Kitchen", onClose: vi.fn(), onInvite: vi.fn(),
};

it("searches by name and email, labels unavailable accounts, and can select from a later page", async () => {
  const requests: Array<{ query: string; page: number }> = [];
  const invite = vi.fn().mockResolvedValue(undefined);
  server.use(http.post(apiPath(path), async ({ request }) => {
    expect(request.headers.get("x-shop-id")).toBe("shop-1");
    expect(new URL(request.url).search).toBe("");
    const body = await request.json() as { query: string; page: number };
    requests.push(body);
    if (body.query === "other@example.test") return HttpResponse.json({ accounts: [], page: 1, pageCount: 0 });
    const accounts = body.page === 1 ? [
      { id: "member", fullName: "Dana Levin", email: "dana@example.test", eligibility: "member" },
      { id: "pending", fullName: "Dana Levin", email: "dana.work@example.test", eligibility: "pending" },
    ] : [{ id: "eligible", fullName: null, email: "very.long.eligible@example.test", eligibility: "eligible" }];
    return HttpResponse.json({ accounts, page: body.page, pageCount: 2 });
  }));
  const user = userEvent.setup();
  renderWithRouter(<InviteTeammateSheet {...props} onInvite={invite} />);
  const input = screen.getByRole("searchbox", { name: "Search by name or email" });
  expect(requests).toEqual([]);
  await user.type(input, "other@example.test");
  expect(await screen.findByText("No matching accounts.")).toBeInTheDocument();
  await user.clear(input);
  await user.type(input, "Dana");
  expect(await screen.findByText("dana.work@example.test")).toBeInTheDocument();
  expect(screen.getAllByText("Dana Levin")).toHaveLength(2);
  expect(screen.getByText("Already on team")).toBeInTheDocument();
  expect(screen.getByText("Invite pending")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /dana/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  const candidate = await screen.findByRole("button", { name: /no name set very.long.eligible@example.test/i });
  expect(requests).toEqual([
    { query: "other@example.test", page: 1 }, { query: "Dana", page: 1 }, { query: "Dana", page: 2 },
  ]);
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  await user.click(candidate);
  await user.click(screen.getByRole("radio", { name: "Admin" }));
  await user.click(screen.getByRole("button", { name: "Send invite" }));
  expect(invite).toHaveBeenCalledExactlyOnceWith("eligible", "admin");
});

it("retries search errors and drops results when the selected shop changes", async () => {
  let attempts = 0;
  server.use(http.post(apiPath(path), () => {
    attempts += 1;
    if (attempts === 1) return HttpResponse.json({ error: { message: "Temporarily unavailable" } }, { status: 503 });
    return HttpResponse.json({
      accounts: [{ id: "eligible", fullName: "Scoped Person", email: "scope@example.test", eligibility: "eligible" }],
      page: 1, pageCount: 1,
    });
  }));
  const user = userEvent.setup();
  const { rerender } = renderWithRouter(<InviteTeammateSheet {...props} />);
  await user.type(screen.getByRole("searchbox"), "scope");
  await user.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText("scope@example.test")).toBeInTheDocument();
  rerender(<InviteTeammateSheet {...props} shopId="shop-2" />);
  expect(screen.queryByText("scope@example.test")).not.toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveValue("");
});
