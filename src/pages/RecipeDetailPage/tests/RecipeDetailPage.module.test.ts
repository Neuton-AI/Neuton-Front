import { authState, resetAuth } from "@/test/auth";
import { buildRecipe } from "@/test/factories/recipes.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/render";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it, vi } from "vitest";
import { useRecipeDetailPage } from "../RecipeDetailPage.module";
vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useParams: () => ({ id: "rp-1" }),
}));
beforeEach(resetAuth);
it("derives preparation steps and linked ingredients outside the view", async () => {
  const recipe = buildRecipe({
    steps: [
      { stepNumber: 1, instruction: "Mix" },
      { stepNumber: 2, instruction: "Bake" },
    ],
  });
  recipe.costing.ingredients[0]!.generalPriceId = "price-1";
  server.use(
    http.get(apiPath("/recipes/rp-1"), () => HttpResponse.json({ recipe })),
  );
  const { result } = renderHookWithProviders(() => useRecipeDetailPage());
  await waitFor(() => expect(result.current.steps).toEqual(["Mix", "Bake"]));
  expect(result.current.recipe?.costing.ingredients[0]?.isLinked).toBe(true);
  expect(result.current.incomplete).toBe(false);
});
it("rejects member actions through the public hook as well as the UI", async () => {
  authState.role = "member";
  const { result } = renderHookWithProviders(() => useRecipeDetailPage());
  await waitFor(() => expect(result.current.recipe).not.toBeNull());
  expect(result.current.canVerify).toBe(false);
  await act(() => result.current.verify());
  await act(() => result.current.remove());
  expect(result.current.verifyError).toBeNull();
  expect(result.current.deleteError).toBeNull();
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
