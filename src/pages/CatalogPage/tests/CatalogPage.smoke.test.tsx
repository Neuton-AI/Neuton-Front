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
  "@/features/auth/supabase",
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

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
