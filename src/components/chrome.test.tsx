import { BottomNav } from "@/components/BottomNav/BottomNav";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { StatCard } from "@/components/StatCard/StatCard";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

describe("BottomNav", () => {
  it("is a labelled primary navigation landmark", () => {
    renderWithRouter(<BottomNav />, { route: "/dashboard" });

    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
  });

  it("renders the capture link between Catalog and Orders", () => {
    renderWithRouter(<BottomNav />, { route: "/dashboard" });

    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/dashboard",
      "/catalog",
      "/capture",
      "/orders",
      "/profile",
    ]);
  });

  it("opens the capture route directly from the center action", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Routes>
        <Route path="/dashboard" element={<BottomNav />} />
        <Route path="/capture" element={<h1>Capture</h1>} />
      </Routes>,
      { route: "/dashboard" },
    );

    await user.click(screen.getByRole("link", { name: "Scan or upload" }));

    expect(screen.getByRole("heading", { name: "Capture" })).toBeInTheDocument();
  });

  it('marks exactly the active tab with aria-current="page"', () => {
    renderWithRouter(<BottomNav />, { route: "/orders" });

    const current = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/orders");
  });
});

describe("PageHeader", () => {
  it("renders the eyebrow, title and action", () => {
    renderWithRouter(
      <PageHeader
        eyebrow="Monday, 2 March"
        title="Catalog"
        action={<button type="button">Add item</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Catalog" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monday, 2 March")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add item" }),
    ).toBeInTheDocument();
  });

  it("omits the back button when no handler is passed", () => {
    renderWithRouter(<PageHeader title="Dashboard" />);

    expect(screen.queryByRole("button", { name: "Go back" })).toBeNull();
  });

  it("calls onBack from an icon-only button with a name", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithRouter(<PageHeader title="Receipt" onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("StatCard", () => {
  it("renders the label and value", () => {
    renderWithRouter(<StatCard label="Revenue" value="£1,204.50" />);

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("£1,204.50")).toBeInTheDocument();
  });

  it("renders the middle slot between label and value", () => {
    renderWithRouter(
      <StatCard
        label="Avg order"
        value="£18.40"
        middle={<button type="button">Toggle</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Toggle" })).toBeInTheDocument();
  });

  it("leaves out the value paragraph entirely when no value is supplied", () => {
    const { container } = renderWithRouter(<StatCard label="Revenue" />);

    // An empty value must not render a stray "undefined" or "NaN".
    expect(container.textContent).toBe("Revenue");
  });

  it("renders the sub line only when given one", () => {
    const withSub = renderWithRouter(
      <StatCard label="Revenue" value="£0" sub="+12% vs last week" />,
    );
    expect(withSub.container.textContent).toContain("+12% vs last week");

    withSub.unmount();
    renderWithRouter(<StatCard label="Revenue" value="£0" />);
    expect(screen.getByText("£0")).toBeInTheDocument();
    expect(screen.queryByText("+12% vs last week")).toBeNull();
  });
});
