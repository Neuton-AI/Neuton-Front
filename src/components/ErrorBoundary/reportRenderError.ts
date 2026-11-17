import { faro, type TransportItem } from "@grafana/faro-web-sdk";
import { matchPath } from "react-router-dom";

const renderErrorType = "ReactRenderError";
const routes = [
  "/", "/landing", "/signin", "/signup", "/auth/complete", "/error",
  "/dashboard", "/catalog", "/orders", "/orders/new", "/orders/:id",
  "/catalog/recipes/:id", "/catalog/recipes/:id/edit", "/catalog/receipts/:id",
  "/profile", "/capture",
];

function getRoutePattern(pathname: string): string {
  return routes.find((route) => matchPath(route, pathname)) ?? "/unmatched";
}

export function reportRenderError(pathname: string, componentStack: string | null | undefined) {
  const frames = componentStack?.match(/^\s*at [\w.$<>-]+(?=\s|$)/gm) ?? [];

  // Raw exceptions can contain user data in their messages, causes and source URLs.
  faro.api?.pushError(new Error("React render failed"), {
    type: renderErrorType,
    stackFrames: [],
    context: {
      componentStack: frames.map((frame) => frame.trim()).join("\n"),
      route: getRoutePattern(pathname),
      environment: import.meta.env.MODE,
      version: import.meta.env.VITE_APP_VERSION || "dev",
    },
  });
}

export function redactFaroPageUrl(item: TransportItem): TransportItem {
  const page = item.meta.page;
  if (!page?.url) return item;

  const { origin, pathname } = new URL(page.url);
  const route = getRoutePattern(pathname);

  // Faro uses the first item's metadata for the entire batch.
  return { ...item, meta: { ...item.meta, page: { ...page, url: origin + route } } };
}
