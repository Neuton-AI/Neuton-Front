import type { Recipe, RecipeStatus } from '@/features/recipes/types';
function makeRecipe(status: RecipeStatus): Recipe {
  return {
    id: 'rp-1',
    shopId: 'shop-1',
    name: 'Tomato Soup',
    description: null,
    imageUrl: null,
    categoryId: null,
    prepTimeMinutes: 20,
    yieldQuantity: '4',
    yieldUnit: 'servings',
    targetMarginPct: '30',
    allergens: null,
    steps: [{ stepNumber: 1, instruction: 'Simmer the tomatoes.' }, { stepNumber: 2, instruction: 'Blend until smooth.' }],
    isActive: true,
    status,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
    costing: {
      ingredientsCost: 6.4,
      laborCost: 2,
      batchCost: 8.4,
      unitCost: 2.1,
      yieldQuantity: 4,
      retailPrice: 10.5,
      appliedProfitMargin: 30,
      inStock: true,
      ingredients: [
        {
          name: 'Tomatoes',
          quantity: 2,
          rawSrcUnit: 'kg',
          averageUnitCost: 1.5,
          lineCost: 3,
          currentQuantity: 8,
        },
      ],
    },
  };
}
export function buildRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return { ...makeRecipe('unverified'), ...overrides };
}
