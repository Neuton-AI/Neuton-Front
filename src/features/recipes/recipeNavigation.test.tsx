import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  parsePath,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useRecipeNavigation } from "./recipeNavigation";

const catalog = "/catalog?tab=recipes&search=tomato#results";
const detail = "/catalog/recipes/rp-1";
const editor = `${detail}/edit`;

const Catalog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      onClick={() =>
        navigate(detail, {
          state: {
            recipeReturnTo: location.pathname + location.search + location.hash,
          },
        })
      }
    >
      Open recipe
    </button>
  );
};

const Recipe: React.FC = () => {
  const navigation = useRecipeNavigation();
  const location = useLocation();
  const close = location.pathname.endsWith("/edit")
    ? navigation.showDetails
    : navigation.close;
  return (
    <>
      <button onClick={close}>Close</button>
      <button onClick={() => navigation.edit()}>Edit</button>
      <button onClick={() => navigation.edit(2)}>Link ingredient</button>
      <button onClick={navigation.showDetails}>Cancel linking</button>
      <button onClick={navigation.showDetails}>Save</button>
    </>
  );
};

const History: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <output aria-label="Current route">
        {location.pathname + location.search + location.hash}
      </output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
};

function renderNavigation(
  route = catalog,
  state?: unknown,
  previous = "/dashboard",
) {
  return render(
    <MemoryRouter
      initialEntries={[previous, { ...parsePath(route), state }]}
      initialIndex={1}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <History />
      <Routes>
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/catalog/recipes/:id" element={<Recipe />} />
        <Route path="/catalog/recipes/:id/edit" element={<Recipe />} />
        <Route path="*" element={<p>Other destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function expectRoute(route: string) {
  expect(screen.getByLabelText("Current route")).toHaveTextContent(route);
  expect(screen.getByLabelText("Current route").textContent).toBe(route);
}

describe("recipe navigation history", () => {
  it("returns to the catalog query and hash after repeatedly editing, linking and saving", () => {
    renderNavigation();
    click("Open recipe");
    click("Edit");
    expectRoute(editor);
    click("Save");
    expectRoute(detail);
    click("Link ingredient");
    expectRoute(`${editor}?ingredient=2`);
    click("Cancel linking");
    expectRoute(detail);
    click("Link ingredient");
    click("Save");
    click("Close");
    expectRoute(catalog);
    click("Browser back");
    expectRoute(catalog);
    click("Browser back");
    expectRoute("/dashboard");
  });

  it("closes the editor to details and then the catalog without leaving stale entries", () => {
    renderNavigation();
    click("Open recipe");
    click("Edit");
    click("Close");
    expectRoute(detail);
    click("Close");
    expectRoute(catalog);
    click("Browser back");
    expectRoute(catalog);
  });

  it("keeps browser Back pointed at the catalog throughout internal recipe transitions", () => {
    renderNavigation();
    click("Open recipe");
    click("Edit");
    click("Save");
    click("Link ingredient");
    click("Browser back");
    expectRoute(catalog);
  });

  it("does not leave stale recipe pages in history after repeated visits", () => {
    renderNavigation();
    for (let visit = 0; visit < 3; visit += 1) {
      click("Open recipe");
      click("Edit");
      click("Save");
      click("Close");
      expectRoute(catalog);
    }
    for (let entry = 0; entry < 3; entry += 1) {
      click("Browser back");
      expectRoute(catalog);
    }
    click("Browser back");
    expectRoute("/dashboard");
  });

  it.each([detail, editor, `${editor}?ingredient=2`])(
    "closes direct entry at %s to the recipes catalog",
    (route) => {
      renderNavigation(route);
      click("Close");
      if (route.startsWith(editor)) {
        expectRoute(detail);
        click("Close");
      }
      expectRoute("/catalog?tab=recipes");
      click("Browser back");
      expectRoute("/dashboard");
    },
  );

  it("retains a restored location state through edit and save after a reload", () => {
    renderNavigation(editor, { recipeReturnTo: catalog });
    click("Save");
    click("Edit");
    click("Close");
    expectRoute(detail);
    click("Close");
    expectRoute(catalog);
  });

  it("uses the catalog fallback after direct-entry edit and save transitions", () => {
    renderNavigation(detail);
    click("Link ingredient");
    click("Save");
    click("Close");
    expectRoute("/catalog?tab=recipes");
  });

  it("returns to the originating order with its query and hash intact", () => {
    const origin = "/orders/order-1?x=1#section";
    renderNavigation(detail, { recipeReturnTo: origin });
    click("Edit");
    click("Save");
    click("Close");
    expectRoute(origin);
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "https://example.com/catalog",
    "//example.com/catalog",
    "catalog?tab=recipes",
    detail,
    `${editor}?ingredient=2`,
  ])("rejects invalid return destination %j", (recipeReturnTo) => {
    renderNavigation(detail, { recipeReturnTo });
    click("Edit");
    click("Save");
    click("Close");
    expectRoute("/catalog?tab=recipes");
  });
});
