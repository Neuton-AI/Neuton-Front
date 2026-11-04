import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { analyticsHandlers } from './handlers/analytics.handlers';
import { catalogHandlers } from './handlers/catalog.handlers';
import { ordersHandlers } from './handlers/orders.handlers';
import { shopsHandlers } from './handlers/shops.handlers';
export const server = setupServer(
  http.post('*/api/v1/auth/csrf', () =>
    HttpResponse.json({ csrfToken: 'A'.repeat(43) }),
  ),
  ...ordersHandlers,
  ...catalogHandlers,
  ...shopsHandlers,
  ...analyticsHandlers,
);
