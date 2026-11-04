import type { ShopId, AuthenticatedContext } from '@/lib/queryTypes';
import { identityQueryKey } from '@/features/auth/environment';
export const recipesKeys = {
  recipes: (identity: AuthenticatedContext, shopId: ShopId) =>
    identityQueryKey(identity, 'recipes', shopId),
  orderableRecipes: (identity: AuthenticatedContext, shopId: ShopId) =>
    identityQueryKey(identity, 'recipes', shopId, 'orderable'),
  recipe: (identity: AuthenticatedContext, shopId: ShopId, id: string) =>
    identityQueryKey(identity, 'recipe', shopId, id),
};
