import { LandingPage } from "@/pages/LandingPage/LandingPage";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("LandingPage", () => {
  it("renders hero headline, eyebrow and value proposition", () => {
    renderWithRouter(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Just upload. Neuton takes care of the numbers.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("For small kitchens")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Snap a receipt, drop in a recipe, log an order. Neuton turns them into unit costs, stock, and profit.",
      ),
    ).toBeInTheDocument();
  });

  it('renders "Start free" and "Create free account" links pointing to /signup', () => {
    renderWithRouter(<LandingPage />);

    const startFreeLinks = screen.getAllByRole("link", { name: "Start free" });
    expect(startFreeLinks.length).toBeGreaterThanOrEqual(2);
    startFreeLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/signup");
    });

    const createAccountLink = screen.getByRole("link", {
      name: "Create free account",
    });
    expect(createAccountLink).toHaveAttribute("href", "/signup");
  });

  it('renders "Log in" footer link pointing to /signin', () => {
    renderWithRouter(<LandingPage />);

    const loginLink = screen.getByRole("link", { name: "Log in" });
    expect(loginLink).toHaveAttribute("href", "/signin");
  });

  it("renders product preview cards with extracted receipt and profit metrics", () => {
    renderWithRouter(<LandingPage />);

    expect(screen.getByText("Greenfield Market")).toBeInTheDocument();
    expect(screen.getByText("Sept 29 · Photo upload")).toBeInTheDocument();
    expect(screen.getByText("Butter, salted · 2 kg")).toBeInTheDocument();
    expect(screen.getByText("$52.10")).toBeInTheDocument();
    expect(screen.getByText("NET PROFIT")).toBeInTheDocument();
    expect(screen.getByText("$3,482")).toBeInTheDocument();
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
  });

  it('renders "How it works" section with 3 steps', () => {
    renderWithRouter(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "From receipt to real costs.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Upload" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Neuton reads it" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "See the numbers" }),
    ).toBeInTheDocument();
  });

  it('renders "What you get" feature cards', () => {
    renderWithRouter(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Know what every recipe and order makes.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "True cost per recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Stock that updates itself",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Margin before you say yes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Revenue, expenses, profit",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("$5.00 + 12 km × $1.50 = $23.00"),
    ).toBeInTheDocument();
  });

  it("renders pricing tiers with Free, Pro, and Business plans", () => {
    renderWithRouter(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Start free. Upgrade when you need more.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(screen.getByText("MOST POPULAR")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("$49")).toBeInTheDocument();
  });

  it("toggles navigation menu when hamburger button is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<LandingPage />);

    const menuButton = screen.getByRole("button", {
      name: "Toggle navigation menu",
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/signin",
    );

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
