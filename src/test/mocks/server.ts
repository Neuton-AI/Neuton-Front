import { setupServer } from 'msw/node';
import { analyticsHandlers } from './handlers/analytics.handlers';
import { catalogHandlers } from './handlers/catalog.handlers';
import { ordersHandlers } from './handlers/orders.handlers';
import { shopsHandlers } from './handlers/shops.handlers';
export const server = setupServer(
  ...ordersHandlers,
  ...catalogHandlers,
  ...shopsHandlers,
  ...analyticsHandlers,
);
