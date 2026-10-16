import { buildShop } from '@/test/factories/shops.factory';
import { http, HttpResponse } from 'msw';
import { apiPath, requireContext } from './context';
export const shopsHandlers = [
  http.get(
    apiPath('/shop'),
    ({ request }) => requireContext(request) ?? HttpResponse.json({ shop: buildShop() }),
  ),
];
