export type RecipeStatus = 'pending' | 'processing' | 'unverified' | 'verified' | 'failed';

export type RecipeIngredient = {
  id?: string;
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

export type RecipeUpdate = {
  name: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  yieldQuantity: number;
  yieldUnit: string;
  allergens: string[];
  steps: { stepNumber: number; instruction: string }[];
  ingredients: {
    rawName: string;
    rawMaterialName: string;
    quantity: number;
    rawSrcUnit: string;
    inventoryItemId: string | null;
    generalPriceId: string | null;
  }[];
};

export type BarcodePriceInput = {
  barcode: string;
  rawMaterialName: string;
  quantity: number;
  rawSrcUnit: string;
};

export type BarcodePrice = {
  id: string;
  rawName: string;
  rawSrcUnit: string;
  quantity: number;
  baseUnit: string;
  baseUnitAmount: number | string;
  baseUnitCost: number | string;
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
