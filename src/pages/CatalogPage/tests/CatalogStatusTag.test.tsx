import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CatalogStatusTag } from "../components/CatalogStatusTag/CatalogStatusTag";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([
  "uploading",
  "pending",
  "processing",
  "unverified",
  "verified",
  "failed",
] as const)("names the compact %s status accessibly", (status) => {
  render(<CatalogStatusTag status={status} />);
  const button = screen.getByRole("button", { name: new RegExp(status, "i") });
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(button.querySelector("svg")).toHaveAttribute("width", "16");
});

it("holds the label for one second after expansion finishes, then collapses", () => {
  render(<CatalogStatusTag status="unverified" />);
  const button = screen.getByRole("button", { name: /Unverified/ });
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  act(() => vi.advanceTimersByTime(1000));
  expect(button).toHaveAttribute("aria-expanded", "true");
  act(() => vi.advanceTimersByTime(300));
  expect(button).toHaveAttribute("aria-expanded", "false");
});

it("supports Enter and Space activation", async () => {
  vi.useRealTimers();
  const user = userEvent.setup();
  render(<CatalogStatusTag status="verified" />);
  const button = screen.getByRole("button", { name: /Verified/ });
  await user.tab();
  expect(button).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(button).toHaveAttribute("aria-expanded", "true");
  await user.keyboard(" ");
  expect(button).toHaveAttribute("aria-expanded", "false");
});

it("keeps the one-second close with reduced motion", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  render(<CatalogStatusTag status="verified" />);
  const button = screen.getByRole("button", { name: /Verified/ });
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  act(() => vi.advanceTimersByTime(999));
  expect(button).toHaveAttribute("aria-expanded", "true");
  act(() => vi.advanceTimersByTime(1));
  expect(button).toHaveAttribute("aria-expanded", "false");
});

it("closes on a second tap, cancels its timer, and resets on a status change", () => {
  const { rerender, unmount } = render(<CatalogStatusTag status="pending" />);
  const button = screen.getByRole("button", { name: /Pending/ });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(vi.getTimerCount()).toBe(0);
  rerender(<CatalogStatusTag status="processing" />);
  expect(screen.getByRole("button", { name: /Processing/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
