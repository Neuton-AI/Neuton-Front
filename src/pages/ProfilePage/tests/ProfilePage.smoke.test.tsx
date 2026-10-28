import { authState, resetAuth } from "@/test/auth";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ProfilePage } from "../ProfilePage";
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
beforeEach(resetAuth);
it("loads shop settings through real HTTP and renders members read-only", async () => {
  authState.role = "member";
  const user = userEvent.setup();
  renderWithRouter(<ProfilePage />);
  await user.click(screen.getByRole("tab", { name: "shop" }));
  expect(
    await screen.findByRole("spinbutton", { name: "Target profit margin" }),
  ).toHaveValue(30);
  expect(
    screen.getByRole("spinbutton", { name: "Target profit margin" }),
  ).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
});
