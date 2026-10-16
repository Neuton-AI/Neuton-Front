import { buildDashboard } from '@/test/factories/analytics.factory';
import { http, HttpResponse } from 'msw';
import { apiPath, requireContext } from './context';
export const analyticsHandlers = [
  http.get(
    apiPath('/analytics/dashboard'),
    ({ request }) => requireContext(request) ?? HttpResponse.json(buildDashboard()),
  ),
];
