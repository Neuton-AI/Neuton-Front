# N-19 — period-aware dashboard card captions

Manual verification for backlog item **N-19** ("Two further caption drifts"), UI-only fix
in `src/pages/DashboardPage.tsx`.

## What changed

| Card | Before | After |
| --- | --- | --- |
| Top item | `58 sold this month` (constant) | `11 sold · 7D` / `58 sold · 30D` / `163 sold · 90D` / `702 sold · 1Y` |
| Profit / order | `avg · 41 orders` (no period) | `avg · 9 orders · 7D` … `avg · 494 orders · 1Y` |

## Proof

`before-*.png` is the pre-fix build, `after-*.png` the fixed build. Same stub, same
viewport, same shop. The selected tab pill is visible in each frame directly above the cards.

| Tab | before-7d/30d/90d/1y.png | after-7d/30d/90d/1y.png |
| --- | --- | --- |
| 7D | `11 sold this month` | `11 sold · 7D` |
| 30D | `58 sold this month` | `58 sold · 30D` |
| 90D | `163 sold this month` | `163 sold · 90D` |
| 1Y | `702 sold this month` | `702 sold · 1Y` |

Caption text was also read out of the accessibility tree at every tab, not only from pixels:

```
7D  tabs ["7D","Average"]  captions ["11 sold · 7D",  "avg · 9 orders · 7D"]
30D tabs ["30D","Average"] captions ["58 sold · 30D", "avg · 41 orders · 30D"]
90D tabs ["90D","Average"] captions ["163 sold · 90D","avg · 118 orders · 90D"]
1Y  tabs ["1Y","Average"]  captions ["702 sold · 1Y", "avg · 494 orders · 1Y"]
```

`Gross income · 30d` and `Operational · 30d` stay constant in **every** frame on purpose —
they belong to backlog §4.3, which this change deliberately does not touch.

## STUBBED PAYLOAD — read this

`GET /api/v1/analytics/dashboard` returns **500** in this environment:

```
The "string" argument must be of type string or an instance of Buffer or ArrayBuffer.
Received an instance of Date
```

That is pre-existing backlog item **§4.1** (`in backlog`), not this bug. To render the
dashboard at all, `window.fetch` was patched for that one endpoint with a deterministic,
period-dependent payload — `stub-dashboard-fetch.js` in this folder, installed through
`navigate_page({ initScript })` before any app script ran. **The identical stub was used for
the before and after passes.**

Consequently these were **not** exercised against a live backend:

- real period-window arithmetic (`30d` really does mean trailing 30 days),
- the real `topItem` / `orderProfitability` numbers,
- the empty state (`No sales yet`, `sampleSize = 0`),
- error and retry behaviour for this endpoint.

Everything asserted above is presentation logic driven by the selected `period` value, which
the tab click supplies for real.

## Reproducing

```bash
npm run dev -- --port 5176      # any free port
# open http://localhost:5176/signin  — testtest@gmail.com / testtest, shop testShop
```

Then either serve `stub-dashboard-fetch.js` as the first script on the document
(`initScript` / `Page.addScriptToEvaluateOnNewDocument`), or paste it into the console and
click any period tab — the console path only takes effect from the next fetch onwards, so
the first paint still shows the §4.1 error.