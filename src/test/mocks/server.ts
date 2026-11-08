import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiPath } from './handlers/context';
import { analyticsHandlers } from './handlers/analytics.handlers';
import { catalogHandlers } from './handlers/catalog.handlers';
import { ordersHandlers } from './handlers/orders.handlers';
import { shopsHandlers } from './handlers/shops.handlers';
export const server = setupServer(
  http.post(apiPath('/auth/csrf'), () => HttpResponse.json({ token: 'test-csrf' })),
  ...ordersHandlers,
  ...catalogHandlers,
  ...shopsHandlers,
  ...analyticsHandlers,
);
