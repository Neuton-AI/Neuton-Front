export type RecipeStatus = 'pending' | 'processing' | 'unverified' | 'verified' | 'failed';

export type RecipeIngredient = {
  /** Stable row id from costRecipe — the link endpoint targets it. */
  id?: string | null;
  name: string;
  quantity: number;
  rawSrcUnit: string;
  rawMaterialName?: string;
  baseUnit?: string | null;
  baseUnitAmount?: string | null;
  averageUnitCost: number | null;
  lineCost: number | null;
  currentQuantity: number;
  /** Inventory or supermarket price ID determines linking; never infer it from cost. */
  inventoryItemId?: string | null;
  generalPriceId?: string | null;
  rawName?: string;
  linked?: boolean;
};

export type RecipeCosting = {
  costComplete?: boolean;
  unresolvedCount?: number;
  ingredientsCost: number;
  laborCost: number;
  batchCost: number | null;
  unitCost: number | null;
  yieldQuantity: number;
  retailPrice: number | null;
  /** Backend field is `appliedMarginPercent`. */
  appliedProfitMargin: number;
  /** False when any ingredient is short for a single batch. */
  inStock: boolean;
  ingredients: RecipeIngredient[];
  /** Trusted incomplete-cost signal from costRecipe — never infer from a $0 cost. */
  linkedCount?: number;
  totalCount?: number;
};

export type Recipe = {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  prepTimeMinutes: number;
  yieldQuantity: string;
  yieldUnit: string;
  targetMarginPct: string | null;
  allergens: string[] | null;
  steps: { stepNumber: number; instruction: string }[];
  isActive: boolean;
  status?: RecipeStatus;
  createdAt: string;
  updatedAt: string;
  costing: RecipeCosting;
};
