import { buildReceiptDetail } from '@/test/factories/receipts.factory';
import { buildRecipe } from '@/test/factories/recipes.factory';
import { http, HttpResponse } from 'msw';
import { apiPath, requireContext } from './context';

export const catalogHandlers = [
  http.get(
    apiPath('/recipes'),
    ({ request }) => requireContext(request) ?? HttpResponse.json({ recipes: [buildRecipe()] }),
  ),
  http.get(
    apiPath('/recipes/:id'),
    ({ request }) => requireContext(request) ?? HttpResponse.json({ recipe: buildRecipe() }),
  ),
  http.get(
    apiPath('/receipts'),
    ({ request }) =>
      requireContext(request) ?? HttpResponse.json({ receipts: [buildReceiptDetail()] }),
  ),
  http.get(
    apiPath('/receipts/:id'),
    ({ request }) =>
      requireContext(request) ?? HttpResponse.json({ receipt: buildReceiptDetail() }),
  ),
  http.get(
    apiPath('/inventory'),
    ({ request }) => requireContext(request) ?? HttpResponse.json({ items: [] }),
  ),
];
