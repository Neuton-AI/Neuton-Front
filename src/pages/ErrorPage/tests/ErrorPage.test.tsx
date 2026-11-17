import { ErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("ErrorPage", () => {
  it("shows the crash message, recovery actions and decorative artwork", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<ErrorPage onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't load your kitchen just now. Your recipes, receipts and orders are safe."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByTestId("rotten-onion")).toHaveAttribute("aria-hidden", "true");
    const support = screen.getByText("Contact support");
    expect(support).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: "Contact support" })).not.toBeInTheDocument();
    await user.click(support);
    expect(onRetry).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
