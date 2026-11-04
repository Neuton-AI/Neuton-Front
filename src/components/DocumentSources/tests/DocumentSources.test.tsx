import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/render";
import { DocumentSources } from "../DocumentSources";
import { setApiIdentity } from "@/lib/api-context";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => api);
const source = {
  sourceId: "s1",
  storagePath: "shop/original.pdf",
  contentType: "application/pdf",
  originalFilename: "invoice.pdf",
  byteSize: 1000,
  preview: {
    storagePath: "shop/preview.webp",
    contentType: "image/webp" as const,
    width: 800,
    height: 1200,
  },
};

beforeEach(() => {
  api.apiFetch
    .mockReset()
    .mockImplementation(
      async (_path: string, options: { body: { path: string } }) => ({
        url: `https://storage.test/${options.body.path}`,
        expiresIn: 3600,
      }),
    );
});

it("closes a pending original and discards its late URL after account changes", async () => {
  let release!: (value: { url: string; expiresIn: number }) => void;
  api.apiFetch.mockImplementation(
    async (_path: string, options: { body: { path: string } }) => {
      if (options.body.path === source.storagePath) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return { url: "https://storage.test/preview.webp", expiresIn: 3600 };
    },
  );
  const target = { opener: {}, location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(target as unknown as Window);
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[source]}
    />,
  );
  await screen.findByAltText("invoice.pdf");
  fireEvent.click(
    screen.getByRole("button", { name: "View original invoice.pdf" }),
  );
  await waitFor(() => expect(release).toBeDefined());
  setApiIdentity({ environment: "test", userId: "someone-else" });
  expect(target.close).toHaveBeenCalled();
  release({
    url: "https://storage.test/old-private-original.pdf",
    expiresIn: 3600,
  });
  await waitFor(() => expect(target.close).toHaveBeenCalledTimes(2));
  expect(target.location.href).toBe("");
});

it("loads only the WebP preview, and signs the original only after a click", async () => {
  const target = { opener: {}, location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(target as unknown as Window);
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[source]}
    />,
  );
  expect(await screen.findByAltText("invoice.pdf")).toHaveAttribute(
    "src",
    "https://storage.test/shop/preview.webp",
  );
  expect(api.apiFetch).toHaveBeenCalledTimes(1);
  expect(api.apiFetch.mock.calls[0][1].body.path).toBe(
    source.preview.storagePath,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "View original invoice.pdf" }),
  );
  await waitFor(() =>
    expect(target.location.href).toBe("https://storage.test/shop/original.pdf"),
  );
  expect(api.apiFetch).toHaveBeenCalledTimes(2);
  expect(target.opener).toBeNull();
});

it("automatically uses the original image for legacy sources", async () => {
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[{ ...source, preview: undefined, contentType: "image/png" }]}
    />,
  );
  expect(await screen.findByAltText("invoice.pdf")).toHaveAttribute(
    "src",
    "https://storage.test/shop/original.pdf",
  );
});

it("retains the existing Open PDF link for legacy PDF sources", async () => {
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[{ ...source, preview: undefined }]}
    />,
  );
  expect(
    await screen.findByRole("link", { name: "Open invoice.pdf" }),
  ).toHaveAttribute("href", "https://storage.test/shop/original.pdf");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("keeps original access when a preview fails without automatically requesting it", async () => {
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[source]}
    />,
  );
  fireEvent.error(await screen.findByAltText("invoice.pdf"));
  expect(screen.getByText("Preview could not be loaded.")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "View original invoice.pdf" }),
  ).toBeEnabled();
  expect(api.apiFetch).toHaveBeenCalledTimes(1);
});

it("renders multiple sources in their original order", async () => {
  renderWithRouter(
    <DocumentSources
      identity={{ environment: "test", userId: "u1", sessionId: "session-1" }}
      shopId="shop"
      sources={[
        source,
        { ...source, sourceId: "s2", originalFilename: "page2.pdf" },
      ]}
    />,
  );
  await screen.findByAltText("page2.pdf");
  expect(
    screen.getAllByRole("img").map((img) => img.getAttribute("alt")),
  ).toEqual(["invoice.pdf", "page2.pdf"]);
});
