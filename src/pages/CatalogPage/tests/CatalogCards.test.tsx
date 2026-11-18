import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLocation } from "react-router-dom";
import { renderWithRouter } from "@/test/render";
import { buildRecipe } from "@/test/factories/recipes.factory";
import { buildReceiptDetail } from "@/test/factories/receipts.factory";
import { RecipeCard } from "../components/RecipeCard/RecipeCard";
import { ReceiptRow } from "../components/ReceiptRow/ReceiptRow";

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(["עוגת שוקולד עם קרם וניל", "Chocolate cake", "123 עוגת שוקולד"])(
  "lets each catalog heading detect its own text direction (%s)",
  (name) => {
    const recipe = {
      ...buildRecipe({ name }),
      total: 1,
      linked: 1,
      incomplete: false,
    };
    renderWithRouter(
      <>
        <RecipeCard
          recipe={recipe}
          currency="USD"
          state={{ recipeReturnTo: "/catalog" }}
        />
        <ReceiptRow
          receipt={buildReceiptDetail({ merchantName: name })}
          currency="USD"
        />
      </>,
    );
    for (const heading of screen.getAllByRole("heading", { name })) {
      expect(heading).toHaveAttribute("dir", "auto");
      expect(heading).toHaveAttribute("title", name);
    }
  },
);

it.each([null, 0])(
  "distinguishes an unavailable unit cost from zero (%s)",
  (unitCost) => {
    const base = buildRecipe();
    const recipe = {
      ...base,
      costing: { ...base.costing, unitCost },
      total: 1,
      linked: 1,
      incomplete: false,
    };
    renderWithRouter(
      <RecipeCard
        recipe={recipe}
        currency="USD"
        state={{ recipeReturnTo: "/catalog" }}
      />,
    );
    if (unitCost === null) {
      expect(screen.getByText("No price yet")).toBeInTheDocument();
      expect(screen.queryByText("$0.00")).toBeNull();
    } else {
      expect(screen.getByText("$0.00")).toBeInTheDocument();
    }
  },
);

it.each(["recipe", "receipt"] as const)(
  "expands a %s status independently of detail navigation",
  (kind) => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const recipe = { ...buildRecipe(), total: 1, linked: 1, incomplete: false };
    const card =
      kind === "recipe" ? (
        <RecipeCard
          recipe={recipe}
          currency="USD"
          state={{ recipeReturnTo: "/catalog" }}
        />
      ) : (
        <ReceiptRow receipt={buildReceiptDetail()} currency="USD" />
      );
    renderWithRouter(
      <>
        {card}
        <Location />
      </>,
      { route: "/catalog" },
    );
    const button = screen.getByRole("button", { name: /Unverified/ });
    expect(button.closest("a")).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("location")).toHaveTextContent("/catalog");
    act(() => vi.advanceTimersByTime(1000));
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("link"));
    expect(screen.getByTestId("location")).toHaveTextContent(
      `/catalog/${kind}s/`,
    );
  },
);

it.each([0, 1, 3])(
  "uses the receipt item array for an actual count of %s",
  (count) => {
    const base = buildReceiptDetail();
    const items = Array.from({ length: count }, () => base.items[0]);
    renderWithRouter(
      <ReceiptRow receipt={{ ...base, items }} currency="USD" />,
    );
    expect(screen.getByText(`Items: ${count}`)).toBeInTheDocument();
  },
);

it("shows an unavailable count for records without an item array", () => {
  const { items: _items, ...receipt } = buildReceiptDetail();
  renderWithRouter(<ReceiptRow receipt={receipt} currency="USD" />);
  expect(screen.getByText("Items: —")).toBeInTheDocument();
});

it("does not treat an unprocessed local scan as a receipt with zero items", () => {
  renderWithRouter(
    <ReceiptRow
      receipt={buildReceiptDetail({ localUpload: true, items: [] })}
      currency="USD"
    />,
  );
  expect(screen.getByRole("button", { name: /Uploading/ })).toBeInTheDocument();
  expect(screen.getByText("Items: —")).toBeInTheDocument();
});

it("uses the recipe image and restores the placeholder when it fails", () => {
  const recipe = {
    ...buildRecipe({ imageUrl: "/broken.png" }),
    total: 1,
    linked: 1,
    incomplete: false,
  };
  renderWithRouter(
    <RecipeCard
      recipe={recipe}
      currency="USD"
      state={{ recipeReturnTo: "/catalog" }}
    />,
  );
  const image = document.querySelector("img");
  expect(image).toHaveAttribute("src", "/broken.png");
  fireEvent.error(image!);
  expect(document.querySelector("img")).toBeNull();
});

it("does not infer verification from a complete cost or turn an incomplete cost into zero", () => {
  const recipe = {
    ...buildRecipe({ status: "unverified" }),
    total: 4,
    linked: 2,
    incomplete: true,
  };
  renderWithRouter(
    <RecipeCard
      recipe={recipe}
      currency="USD"
      state={{ recipeReturnTo: "/catalog" }}
    />,
  );
  expect(
    screen.getByRole("button", { name: /Unverified/ }),
  ).toBeInTheDocument();
  expect(screen.getByText("incomplete")).toBeInTheDocument();
  expect(screen.queryByText(/ingredients linked/)).toBeNull();
  expect(screen.queryByText("No price yet")).toBeNull();
  expect(screen.queryByText("$0.00")).toBeNull();
});
