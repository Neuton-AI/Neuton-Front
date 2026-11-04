import { initializeFaro, getWebInstrumentations } from "@grafana/faro-web-sdk";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

const apiBaseUrl = window.location.origin;
// OTEL matches string entries exactly, so a prefix needs a RegExp.
const apiOriginPattern = new RegExp(
  "^" + apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);

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
      instrumentations: [
        ...getWebInstrumentations(),
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
