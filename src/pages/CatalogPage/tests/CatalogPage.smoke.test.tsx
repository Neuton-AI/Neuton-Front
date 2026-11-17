import { resetAuth } from "@/test/auth";
import { buildRecipe } from "@/test/factories/recipes.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderWithRouter } from "@/test/render";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it, vi } from "vitest";
import { CatalogPage } from "../CatalogPage";
vi.mock(
  "@/features/auth/auth",
  async () => (await import("@/test/auth")).authMock,
);
beforeEach(resetAuth);
it("shows a price for supermarket-linked ingredients without optional server counts", async () => {
  const recipe = buildRecipe();
  recipe.costing.ingredients[0]!.generalPriceId = "price-1";
  server.use(
    http.get(apiPath("/recipes"), () =>
      HttpResponse.json({ recipes: [recipe] }),
    ),
  );
  renderWithRouter(<CatalogPage />);
  expect(
    await screen.findByRole("link", { name: /Tomato Soup/ }),
  ).toHaveTextContent("$10.50");
  expect(screen.queryByText(/cost incomplete/)).toBeNull();
});

it.each([
  {
    tab: "recipes",
    title: "No recipes yet",
    body: "Scan a handwritten recipe or upload a photo, and it will appear in your kitchen with costs worked out.",
    capturePath: "/capture?kind=recipe",
  },
  {
    tab: "receipts",
    title: "No receipts yet",
    body: "Snap a supermarket receipt and every line item and expense is extracted for you.",
    capturePath: "/capture",
  },
  {
    tab: "inventory",
    title: "Your pantry is empty",
    body: "Stock levels fill in automatically as you add receipts, and low-stock alerts appear here.",
    capturePath: "/capture",
  },
])("renders the Paper empty state for $tab", async ({ tab, title, body, capturePath }) => {
  server.use(
    http.get(apiPath("/recipes"), () => HttpResponse.json({ recipes: [] })),
    http.get(apiPath("/receipts"), () => HttpResponse.json({ receipts: [] })),
    http.get(apiPath("/inventory"), () => HttpResponse.json({ items: [] })),
  );
  renderWithRouter(<CatalogPage />, { route: `/catalog?tab=${tab}` });

  expect(
    await screen.findByRole("heading", { level: 2, name: title }),
  ).toBeInTheDocument();
  expect(screen.getByText(body)).toBeInTheDocument();
  expect(screen.getByText("Tap + to scan or upload")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Scan or upload" })).toHaveAttribute(
    "href",
    capturePath,
  );
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
