import { initializeFaro, getWebInstrumentations } from "@grafana/faro-web-sdk";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

const apiBaseUrl = window.location.origin;
// OTEL matches string entries exactly, so a prefix needs a RegExp.
const apiOriginPattern = new RegExp(
  "^" + apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);
const sensitiveRoutes = /\/(?:api\/v1\/)?(?:auth|session|profile)(?:[/?#]|$)/i;
const credentialData = /(?:"(?:password|currentPassword|newPassword|cookie|set-cookie|authorization|x-csrf-token|token|ticket|code|state|nonce)"\s*:|Bearer\s|[?&#](?:[^\s"=]*=)|[A-Za-z0-9_-]{43,})/i;

if (
  import.meta.env.VITE_FARO_COLLECTOR_URL &&
  import.meta.env.VITE_FARO_TOKEN
) {
  try {
    initializeFaro({
      url:
        import.meta.env.VITE_FARO_COLLECTOR_URL +
        "/" +
        import.meta.env.VITE_FARO_TOKEN,
      app: {
        name: "Neuton-Front",
        environment: import.meta.env.MODE,
        version: import.meta.env.VITE_APP_VERSION || "dev",
      },
      // Ignore credential exchanges and signed object-storage URLs at collection.
      ignoreUrls: [sensitiveRoutes, /[?#]/],
      beforeSend(item) {
        // Also protects navigation/resource metadata and explicitly reported errors.
        if (sensitiveRoutes.test(window.location.pathname)) return null;
        const serialized = JSON.stringify(item);
        if (sensitiveRoutes.test(serialized) || credentialData.test(serialized)) {
          return null;
        }
        return item;
      },
      instrumentations: [
        ...getWebInstrumentations({ captureConsole: false }),
        new TracingInstrumentation({
          instrumentationOptions: {
            // Cross-origin API calls only carry a W3C traceparent when the
            // URL is listed here; the backend turns it into the traceId
            // that ties browser requests to API/worker/Gemini log lines.
            propagateTraceHeaderCorsUrls: [apiOriginPattern],
          },
        }),
      ],
    });
  } catch (err) {
    console.error("[faro] failed to initialize", err);
  }
}
