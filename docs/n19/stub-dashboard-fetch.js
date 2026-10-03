// Stub for GET /api/v1/analytics/dashboard?period=...
// Installed via chrome-devtools navigate_page({ initScript }) on every document,
// BEFORE any app script runs. Used only for the N-19 manual verification because
// the real endpoint returns 500 ("Received an instance of Date") — backlog §4.1.
//
// The payload is deterministic per period and was byte-identical for the
// "before" and "after" screenshot passes.
(() => {
  const DAY = 86400000;
  const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);
  const SHAPES = {
    '7d': { days: 7, revenue: 420.5, expenses: 130.25, orders: 9, units: 11, avg: 8.4, med: 6.2 },
    '30d': { days: 30, revenue: 1840.0, expenses: 610.4, orders: 41, units: 58, avg: 9.1, med: 7.4 },
    '90d': { days: 90, revenue: 5120.75, expenses: 1710.6, orders: 118, units: 163, avg: 9.6, med: 7.9 },
    '12m': { days: 365, revenue: 21400.5, expenses: 7305.15, orders: 494, units: 702, avg: 10.2, med: 8.3 },
  };
  const net = (r, e) => Number((r - e).toFixed(2));

  const build = (period) => {
    const s = SHAPES[period];
    const slice = s.days <= 30 ? s.days : 30;
    const graph = [];
    for (let i = 0; i < slice; i += 1) {
      const revenue = Number((s.revenue / slice * (0.7 + ((i * 37) % 11) / 16)).toFixed(2));
      const expenses = Number((s.expenses / slice * (0.8 + ((i * 23) % 7) / 14)).toFixed(2));
      graph.push({
        date: new Date(NOW - (slice - 1 - i) * DAY).toISOString().slice(0, 10),
        revenue,
        expenses,
        netProfit: net(revenue, expenses),
      });
    }
    return {
      period,
      range: {
        from: new Date(NOW - (s.days - 1) * DAY).toISOString().slice(0, 10),
        to: new Date(NOW).toISOString().slice(0, 10),
      },
      summary: {
        revenue: s.revenue,
        expenses: s.expenses,
        deliveryFees: 0,
        productionCost: Number((s.expenses * 0.6).toFixed(2)),
        netProfit: net(s.revenue, s.expenses),
        orderCount: s.orders,
        profitMarginPercent: Number(((net(s.revenue, s.expenses) / s.revenue) * 100).toFixed(1)),
      },
      trend: { revenuePercent: 4.2, profitPercent: -3.1, expensesPercent: 2.4 },
      graph,
      topItem: {
        recipeId: 'stub-recipe',
        name: 'Truffle Mushroom Pasta',
        imageUrl: null,
        unitsSold: s.units,
        revenue: net(s.revenue * 0.42, s.expenses * 0.4),
        netProfit: net(s.revenue * 0.42, s.expenses * 0.4),
      },
      orderProfitability: { average: s.avg, median: s.med, sampleSize: s.orders },
      lowStock: [],
    };
  };

  const real = window.fetch;
  window.fetch = function stubbedFetch(input) {
    const url = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
    const match = url.match(/analytics\/dashboard\?period=(7d|30d|90d|12m)/);
    if (match) {
      return Promise.resolve(
        new Response(JSON.stringify(build(match[1])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return real.apply(this, arguments);
  };
})();