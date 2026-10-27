// Display choices and ratios from the API's supermarket/conversion table.
// The server remains authoritative for normalization and pricing on submission.
export const measurementUnits = {
  g: [
    { unit: 'mg', label: 'Milligrams', ratio: 0.001 },
    { unit: 'g', label: 'Grams', ratio: 1 },
    { unit: 'kg', label: 'Kilograms', ratio: 1000 },
    { unit: 'oz', label: 'Ounces', ratio: 28.3495 },
    { unit: 'lb', label: 'Pounds', ratio: 453.592 },
  ],
  ml: [
    { unit: 'ml', label: 'Milliliters', ratio: 1 },
    { unit: 'l', label: 'Liters', ratio: 1000 },
    { unit: 'tsp', label: 'Teaspoons', ratio: 4.92892 },
    { unit: 'tbsp', label: 'Tablespoons', ratio: 14.7868 },
    { unit: 'cup', label: 'Cups', ratio: 236.588 },
  ],
  each: [
    { unit: 'each', label: 'Pieces', ratio: 1 },
    { unit: 'dozen', label: 'Dozens', ratio: 12 },
  ],
};

export function packageBaseUnit(unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs') {
  if (unit === 'pcs') return 'each';
  return unit === 'g' || unit === 'kg' ? 'g' : 'ml';
}

export type RecipeUsageContext = {
  quantity: string;
  rawSrcUnit: string;
  baseUnit?: string | null;
  baseUnitAmount?: string | null;
};
