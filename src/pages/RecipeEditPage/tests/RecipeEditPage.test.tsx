import { authState, resetAuth } from "@/test/auth";
import { buildRecipe } from "@/test/factories/recipes.factory";
import { apiPath } from "@/test/mocks/handlers/context";
import { server } from "@/test/mocks/server";
import { createTestQueryClient, renderWithRouter } from "@/test/render";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { recipesKeys } from "@/features/recipes/keys";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RecipeEditPage } from "../RecipeEditPage";

vi.mock(
  "@/features/auth/supabase",
  async () => (await import("@/test/auth")).authMock,
);
vi.mock("@/components/BarcodeScanner/BarcodeScanner", () => ({
  BarcodeScanner: ({
    onDetected,
    onClose,
    onManualSave,
    error,
  }: {
    onDetected: (barcode: string) => void;
    onClose: () => void;
    onManualSave: (details: {
      name: string;
      price: number;
      packageSize: number;
      packageUnit: "kg";
      quantity: number;
      rawSrcUnit: string;
    }) => void;
    error?: string;
  }) => (
    <div role="dialog" aria-label="Barcode scanner">
      <button onClick={() => onDetected("7290000000001")}>Scan product</button>
      <button onClick={onClose}>Cancel scan</button>
      <button
        onClick={() =>
          onManualSave({
            name: "Manual tomato pack",
            price: 10,
            packageSize: 1,
            packageUnit: "kg",
            quantity: 150,
            rawSrcUnit: "g",
          })
        }
      >
        Save manual product
      </button>
      {error}
    </div>
  ),
}));

it("replaces extracted usage with the submitted manual usage and saves its general-price link", async () => {
  const user = userEvent.setup();
  let createdBody: unknown;
  let savedBody: unknown;
  server.use(
    http.post(apiPath("/recipes/rp-1/manual-product"), async ({ request }) => {
      createdBody = await request.json();
      return HttpResponse.json(
        {
          product: {
            id: "manual-product-1",
            name: "Manual tomato pack",
            rawMaterialName: "Tomato",
          },
          usage: { baseUnit: "g", baseUnitAmount: 150 },
        },
        { status: 201 },
      );
    }),
    http.patch(apiPath("/recipes/rp-1"), async ({ request }) => {
      savedBody = await request.json();
      return HttpResponse.json({ recipe: { id: "rp-1" } });
    }),
  );
  renderEditor();
  await user.click(
    await screen.findByRole("button", {
      name: "Scan barcode for ingredient 1",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Save manual product" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(createdBody).toEqual({
    name: "Manual tomato pack",
    price: 10,
    packageSize: 1,
    packageUnit: "kg",
    rawMaterialName: "Tomato",
    quantity: 150,
    rawSrcUnit: "g",
  });
  expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue(
    "Manual tomato pack",
  );
  expect(screen.getByLabelText("Ingredient 1 amount")).toHaveValue(150);
  expect(screen.getByLabelText("Ingredient 1 unit")).toHaveValue("g");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Recipe destination")).toBeInTheDocument();
  expect(savedBody).toMatchObject({
    ingredients: [
      {
        inventoryItemId: null,
        generalPriceId: "manual-product-1",
        quantity: 150,
        rawSrcUnit: "g",
      },
    ],
  });
});

const originalScrollTo = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollTo",
);
const scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
  // jsdom supplies no layout or element scrolling. Tests that supply a viewport
  // width get the browser's scroll event; other workflows need only a safe stub.
  if (this.clientWidth === 0) return;
  this.scrollLeft = options.left ?? this.scrollLeft;
  fireEvent.scroll(this);
});

beforeEach(() => {
  resetAuth();
  // jsdom has no native dialog top layer; browser verification covers modality.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  scrollTo.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollTo,
  });
});

afterEach(() => {
  if (originalScrollTo) {
    Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  }
});

function renderEditor(allergens: string[] | null = null) {
  const recipe = buildRecipe({ allergens });
  recipe.costing.ingredients[0] = {
    ...recipe.costing.ingredients[0]!,
    id: "ingredient-1",
    rawName: "Original tomatoes",
    rawMaterialName: "Tomato",
    quantity: 2,
    rawSrcUnit: "kg",
    baseUnit: "g",
    baseUnitAmount: "2000.000",
    generalPriceId: "old-unresolved-price",
    linked: false,
  };
  server.use(
    http.get(apiPath("/recipes/rp-1"), () => HttpResponse.json({ recipe })),
  );
  const queryClient = createTestQueryClient();
  const view = renderWithRouter(
    <Routes>
      <Route path="/catalog/recipes/:id/edit" element={<RecipeEditPage />} />
      <Route
        path="/catalog/recipes/:id"
        element={<h1>Recipe destination</h1>}
      />
      <Route path="/catalog" element={<h1>Catalog destination</h1>} />
    </Routes>,
    {
      route: "/catalog/recipes/rp-1/edit?ingredient=ingredient-1",
      queryClient,
    },
  );
  return { ...view, queryClient, recipe };
}

it("keeps an unsaved name, adopts untouched fields and requires explicit conflict resolution", async () => {
  const user = userEvent.setup();
  const editor = renderEditor();
  const name = await screen.findByRole("textbox", { name: "RECIPE NAME" });
  await user.clear(name);
  await user.type(name, "My unsaved name");
  await act(async () =>
    editor.queryClient.setQueryData(recipesKeys.recipe("shop-1", "rp-1"), {
      recipe: {
        ...editor.recipe,
        name: "Another device name",
        yieldQuantity: 9,
      },
    }),
  );
  expect(name).toHaveValue("My unsaved name");
  expect(
    await screen.findByText("name changed elsewhere while you were editing."),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Use server change" }));
  expect(name).toHaveValue("Another device name");
  expect(
    screen.queryByText("name changed elsewhere while you were editing."),
  ).toBeNull();
});

it("shows only known allergens and adds filtered suggestions without duplicates", async () => {
  const user = userEvent.setup();
  renderEditor(["Gluten", "Mustard"]);
  await user.click(await screen.findByRole("tab", { name: "Preparation" }));
  expect(screen.getByRole("button", { name: "Mustard" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByRole("button", { name: "Dairy" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  const input = screen.getByRole("combobox", { name: "Search allergens" });
  expect(input).toHaveFocus();
  expect(screen.getAllByRole("option")).toHaveLength(9);
  expect(screen.queryByRole("option", { name: "Gluten" })).toBeNull();
  await user.type(input, "S");
  expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(
    ["Sesame", "Shellfish", "Soy", "Sulphites"],
  );
  await user.click(screen.getByRole("option", { name: "Soy" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Soy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Add allergen" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  expect(screen.queryByRole("option", { name: "Soy" })).toBeNull();
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true }),
  );
  await user.click(screen.getByRole("button", { name: "Soy" }));
  expect(screen.getByRole("button", { name: "Soy" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await user.click(screen.getByRole("button", { name: "Soy" }));
  expect(screen.getByRole("button", { name: "Soy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("supports clearing, no matches, keyboard selection and cancellation without submitting", async () => {
  const user = userEvent.setup();
  renderEditor();
  await user.click(await screen.findByRole("tab", { name: "Preparation" }));
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  const input = screen.getByRole("combobox", { name: "Search allergens" });
  await user.type(input, "unknown");
  expect(screen.getByRole("status")).toHaveTextContent("No matching allergens");
  await user.keyboard("{Enter}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear search" }));
  expect(input).toHaveFocus();
  expect(screen.getAllByRole("option")).toHaveLength(10);
  await user.type(input, "s");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(screen.getByRole("button", { name: "Shellfish" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Add allergen" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  fireEvent.click(screen.getByRole("dialog"), { clientX: 1, clientY: 1 });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Shellfish" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("saves additions and removals while preserving existing values outside the suggestions", async () => {
  const user = userEvent.setup();
  let savedBody: unknown;
  server.use(
    http.patch(apiPath("/recipes/rp-1"), async ({ request }) => {
      savedBody = await request.json();
      return HttpResponse.json({ recipe: { id: "rp-1" } });
    }),
  );
  const editor = renderEditor(["Gluten", "Mustard"]);
  await user.click(await screen.findByRole("tab", { name: "Preparation" }));
  await user.click(screen.getByRole("button", { name: "Gluten" }));
  expect(screen.getByRole("button", { name: "Gluten" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  await user.click(screen.getByRole("option", { name: "Dairy" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Recipe destination")).toBeInTheDocument();
  expect(savedBody).toMatchObject({ allergens: ["Mustard", "Dairy"] });
  editor.unmount();
  renderEditor(["Mustard", "Dairy"]);
  await user.click(await screen.findByRole("tab", { name: "Preparation" }));
  expect(screen.queryByRole("button", { name: "Gluten" })).toBeNull();
  expect(screen.getByRole("button", { name: "Dairy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("restores selected badges and discards newly added badges on reset", async () => {
  const user = userEvent.setup();
  renderEditor(["Gluten", "Dairy"]);
  await user.click(await screen.findByRole("tab", { name: "Preparation" }));
  await user.click(screen.getByRole("button", { name: "Gluten" }));
  expect(screen.getByRole("button", { name: "Gluten" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  await user.click(screen.getByRole("option", { name: "Soy" }));
  await user.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByRole("button", { name: "Gluten" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Dairy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByRole("button", { name: "Soy" })).toBeNull();
});

it("allows manual linking when the extracted amount and unit are missing", async () => {
  const user = userEvent.setup();
  renderEditor();
  const amount = await screen.findByLabelText("Ingredient 1 amount");
  fireEvent.change(amount, { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Ingredient 1 unit"), {
    target: { value: "" },
  });
  await user.click(
    screen.getByRole("button", { name: "Scan barcode for ingredient 1" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Barcode scanner" }),
  ).toBeInTheDocument();
});

it("keeps one draft across swipes and tabs, resets edits, and focuses the requested ingredient", async () => {
  const user = userEvent.setup();
  renderEditor();
  const name = await screen.findByLabelText("Ingredient 1 name");
  await waitFor(() => expect(name).toHaveFocus());
  expect(name).toHaveValue("Original tomatoes");
  fireEvent.change(screen.getByLabelText("RECIPE NAME"), {
    target: { value: "Changed recipe" },
  });
  const ingredientPanel = screen.getByRole("tabpanel", { name: "Ingredients" });
  const carousel = ingredientPanel.parentElement!;
  Object.defineProperty(carousel, "clientWidth", {
    configurable: true,
    value: 390,
  });
  fireEvent.scroll(carousel, { target: { scrollLeft: 390 } });
  expect(screen.getByRole("tab", { name: "Preparation" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Preparation" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Add allergen" }));
  await user.click(screen.getByRole("option", { name: "Gluten" }));
  await user.click(screen.getByRole("tab", { name: "Ingredients" }));
  expect(screen.getByLabelText("RECIPE NAME")).toHaveValue("Changed recipe");
  await user.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByLabelText("RECIPE NAME")).toHaveValue("Tomato Soup");
  await user.click(screen.getByRole("tab", { name: "Preparation" }));
  expect(screen.queryByRole("button", { name: "Gluten" })).toBeNull();
});

it("supports keyboard tab navigation and excludes the inactive panel from focus and accessibility", async () => {
  const user = userEvent.setup();
  renderEditor();
  await screen.findByLabelText("Ingredient 1 name");
  const ingredientsTab = screen.getByRole("tab", { name: "Ingredients" });
  const preparationTab = screen.getByRole("tab", { name: "Preparation" });
  const ingredientsPanel = document.getElementById(
    ingredientsTab.getAttribute("aria-controls")!,
  )!;
  const preparationPanel = document.getElementById(
    preparationTab.getAttribute("aria-controls")!,
  )!;
  await waitFor(() => {
    expect(ingredientsPanel.inert).toBe(false);
    expect(preparationPanel.inert).toBe(true);
  });
  expect(screen.queryByRole("button", { name: "Gluten" })).toBeNull();
  await user.click(ingredientsTab);

  await user.keyboard("{ArrowRight}");
  expect(preparationTab).toHaveFocus();
  expect(preparationTab).toHaveAttribute("aria-selected", "true");
  expect(preparationTab).toHaveAttribute("tabindex", "0");
  expect(ingredientsTab).toHaveAttribute("tabindex", "-1");
  expect(ingredientsPanel.inert).toBe(true);
  expect(preparationPanel.inert).toBe(false);
  expect(
    screen.queryByRole("textbox", { name: "Ingredient 1 name" }),
  ).toBeNull();
  expect(scrollTo).toHaveBeenLastCalledWith(
    expect.objectContaining({ behavior: "instant" }),
  );

  await user.keyboard("{Home}");
  expect(ingredientsTab).toHaveFocus();
  expect(
    screen.getByRole("textbox", { name: "Ingredient 1 name" }),
  ).toHaveValue("Original tomatoes");
  await user.keyboard("{End}");
  expect(preparationTab).toHaveFocus();
  await user.keyboard("{ArrowLeft}");
  expect(ingredientsTab).toHaveFocus();
  expect(ingredientsPanel.inert).toBe(false);
  expect(preparationPanel.inert).toBe(true);
});

it("replaces an unresolved ingredient with the scanned product, preserving recipe amount and unit on save", async () => {
  const user = userEvent.setup();
  let barcodeBody: unknown;
  let savedBody: unknown;
  server.use(
    http.post(apiPath("/recipes/rp-1/barcode-price"), async ({ request }) => {
      barcodeBody = await request.json();
      return HttpResponse.json({
        price: {
          id: "price-1",
          rawName: "Supermarket tomato pack",
          rawMaterialName: "supermarket tomato pack",
          quantity: 500,
          rawSrcUnit: "ml",
        },
      });
    }),
    http.patch(apiPath("/recipes/rp-1"), async ({ request }) => {
      savedBody = await request.json();
      return HttpResponse.json({ recipe: { id: "rp-1" } });
    }),
  );
  renderEditor();
  await user.click(
    await screen.findByRole("button", {
      name: "Scan barcode for ingredient 1",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Scan product" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(barcodeBody).toEqual({
    barcode: "7290000000001",
    rawMaterialName: "Tomato",
    quantity: 2,
    rawSrcUnit: "kg",
  });
  expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue(
    "Supermarket tomato pack",
  );
  expect(screen.getByLabelText("Ingredient 1 amount")).toHaveValue(2);
  expect(screen.getByLabelText("Ingredient 1 unit")).toHaveValue("kg");
  expect(
    screen.queryByRole("button", { name: "Scan barcode for ingredient 1" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Recipe destination")).toBeInTheDocument();
  expect(savedBody).toMatchObject({
    ingredients: [
      {
        rawName: "Supermarket tomato pack",
        rawMaterialName: "supermarket tomato pack",
        quantity: 2,
        rawSrcUnit: "kg",
        inventoryItemId: null,
        generalPriceId: "price-1",
      },
    ],
  });
  expect(
    (savedBody as { ingredients: object[] }).ingredients[0],
  ).not.toHaveProperty("linked");
  expect(
    (savedBody as { ingredients: object[] }).ingredients[0],
  ).not.toHaveProperty("baseUnitAmount");
});

it("keeps failed scans open for retry and preserves draft edits on cancel", async () => {
  const user = userEvent.setup();
  server.use(
    http.post(apiPath("/recipes/rp-1/barcode-price"), () =>
      HttpResponse.json(
        { error: { message: "Product not found" } },
        { status: 404 },
      ),
    ),
  );
  renderEditor();
  fireEvent.change(await screen.findByLabelText("RECIPE NAME"), {
    target: { value: "Draft stays" },
  });
  await user.click(
    screen.getByRole("button", { name: "Scan barcode for ingredient 1" }),
  );
  await user.click(screen.getByRole("button", { name: "Scan product" }));
  expect(await screen.findByText("Product not found")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel scan" }));
  expect(screen.getByLabelText("RECIPE NAME")).toHaveValue("Draft stays");
  expect(
    screen.getByRole("button", { name: "Scan barcode for ingredient 1" }),
  ).toBeInTheDocument();
});

it("keeps an unsuccessful save in the editor and validates missing ingredients", async () => {
  const user = userEvent.setup();
  const save = vi.fn(() =>
    HttpResponse.json({ error: { message: "Save failed" } }, { status: 500 }),
  );
  server.use(http.patch(apiPath("/recipes/rp-1"), save));
  renderEditor();
  await user.click(await screen.findByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Save failed")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remove ingredient 1" }));
  await user.click(screen.getByRole("tab", { name: "Preparation" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByText(/at least one ingredient/)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Ingredients" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(save).toHaveBeenCalledTimes(1);
});

it("hides editing and scanning for members", async () => {
  authState.role = "member";
  renderEditor();
  expect(
    await screen.findByText("Only shop owners and admins can edit recipes."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Scan barcode/ })).toBeNull();
});

it("waits for membership loading before showing permissions or missing recipe messages", async () => {
  authState.loading = true;
  authState.hasMembership = false;
  renderEditor();
  await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  expect(
    screen.queryByText("Only shop owners and admins can edit recipes."),
  ).toBeNull();
  expect(screen.queryByText("Recipe not found.")).toBeNull();
});

it("deletes through the existing delete endpoint after confirmation", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  server.use(
    http.delete(apiPath("/recipes/rp-1"), () =>
      HttpResponse.json({ ok: true, mode: "hard" }),
    ),
  );
  renderEditor();
  await user.click(
    await screen.findByRole("button", { name: "Delete recipe" }),
  );
  expect(await screen.findByText("Catalog destination")).toBeInTheDocument();
});

vi.mock("@/features/sync/documentsApi", async () => ({
  documentFetch: (await import("@/lib/api")).apiFetch,
}));
