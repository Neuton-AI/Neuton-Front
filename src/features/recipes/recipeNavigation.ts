import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';

const CATALOG = '/catalog?tab=recipes';
const RETURN_ROUTES = [
  '/catalog',
  '/catalog/receipts/:id',
  '/dashboard',
  '/orders',
  '/orders/:id',
  '/profile',
  '/capture',
];

function recipeReturnTo(state: unknown): string {
  if (!state || typeof state !== 'object' || !('recipeReturnTo' in state)) return CATALOG;
  const destination = state.recipeReturnTo;
  if (typeof destination !== 'string' || !destination.startsWith('/')) return CATALOG;

  // Only app destinations outside the recipe flow can be used as an exit.
  try {
    const url = new URL(destination, 'https://neuton.local');
    if (url.origin !== 'https://neuton.local') return CATALOG;
    if (!RETURN_ROUTES.some((route) => matchPath(route, url.pathname))) {
      return CATALOG;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return CATALOG;
  }
}

export function useRecipeNavigation() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = recipeReturnTo(location.state);
  const options = { replace: true, state: { recipeReturnTo: returnTo } };
  const detailPath = `/catalog/recipes/${id}`;

  // Detail and editor share one history entry, so Back never reopens an editor
  // left behind by saving or cancelling. History state also survives a reload.
  return {
    close: () => navigate(returnTo, { replace: true }),
    edit: (ingredient?: number) =>
      navigate(
        `${detailPath}/edit${ingredient === undefined ? '' : `?ingredient=${ingredient}`}`,
        options,
      ),
    showDetails: () => navigate(detailPath, options),
  };
}
