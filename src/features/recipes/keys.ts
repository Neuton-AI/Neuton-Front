import type { ShopId } from '@/lib/queryTypes';
export const recipesKeys = {
  recipes: (shopId: ShopId) => ['recipes', shopId] as const,
  recipe: (shopId: ShopId, id: string) => ['recipe', shopId, id] as const,
};
