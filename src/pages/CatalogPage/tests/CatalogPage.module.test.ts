import { resetAuth } from "@/test/auth";
import { buildRecipe } from "@/test/factories/recipes.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it, vi } from "vitest";
import { useCatalogPage } from "../CatalogPage.module";
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
beforeEach(resetAuth);
it("prices supermarket-linked recipes consistently with detail", async () => {
  const recipe = buildRecipe();
  recipe.costing.ingredients[0]!.generalPriceId = "price-1";
  server.use(
    http.get(apiPath("/recipes"), () =>
      HttpResponse.json({ recipes: [recipe] }),
    ),
  );
  const { result } = renderHookWithProviders(() => useCatalogPage());
  await waitFor(() => expect(result.current.recipes).toHaveLength(1));
  expect(result.current.recipes[0]).toMatchObject({
    linked: 1,
    total: 1,
    incomplete: false,
  });
});
it("loads only the selected tab and keeps failures isolated by tab", async () => {
  server.use(
    http.get(apiPath("/recipes"), () =>
      HttpResponse.json(
        { error: { message: "Recipes unavailable" } },
        { status: 500 },
      ),
    ),
  );
  const { result } = renderHookWithProviders(() => useCatalogPage());
  await waitFor(() =>
    expect(result.current.errors.recipes).toBe("Recipes unavailable"),
  );
  expect(result.current.receipts).toEqual([]);
  act(() => result.current.handleSelectTab("receipts"));
  await waitFor(() => expect(result.current.receipts).toHaveLength(1));
  expect(result.current.tab).toBe("receipts");
  expect(result.current.errors.receipts).toBeUndefined();
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
