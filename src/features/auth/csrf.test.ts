import { afterEach, expect, it, vi } from "vitest";
import { getCsrfToken, resetCsrf } from "./csrf";
import { setApiIdentity } from "@/lib/api-context";

afterEach(() => {
  resetCsrf();
  setApiIdentity(null);
});
it("shares one bootstrap request and keeps the secret only in memory", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ csrfToken: "A".repeat(43) }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const [first, second] = await Promise.all([getCsrfToken(), getCsrfToken()]);
  expect(first).toBe(second);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    credentials: "include",
  });
  expect(JSON.stringify(localStorage)).not.toContain(first);
  resetCsrf();
  fetch.mockResolvedValue(
    new Response(JSON.stringify({ csrfToken: first }), { status: 200 }),
  );
  await getCsrfToken();
  expect(fetch).toHaveBeenCalledTimes(2);
});
