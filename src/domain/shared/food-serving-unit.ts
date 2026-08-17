export const FOOD_SERVING_UNITS = [
  'G',
  'ML',
  'PIECE',
  'KATORI',
  'CUP',
  'GLASS',
  'TBSP',
  'TSP',
] as const;

export type FoodServingUnit = (typeof FOOD_SERVING_UNITS)[number];

const DISPLAY_LABEL: Record<FoodServingUnit, string> = {
  G: 'g',
  ML: 'ml',
  PIECE: 'piece',
  KATORI: 'katori',
  CUP: 'cup',
  GLASS: 'glass',
  TBSP: 'tbsp',
  TSP: 'tsp',
};

const SORT_ORDER: Record<FoodServingUnit, number> = {
  G: 0,
  ML: 1,
  PIECE: 2,
  KATORI: 3,
  CUP: 4,
  GLASS: 5,
  TBSP: 6,
  TSP: 7,
};

export function isFoodServingUnit(value: string): value is FoodServingUnit {
  return (FOOD_SERVING_UNITS as readonly string[]).includes(value);
}

export function foodServingUnitLabel(unit: FoodServingUnit): string {
  return DISPLAY_LABEL[unit];
}

export function foodServingUnitSortOrder(unit: FoodServingUnit): number {
  return SORT_ORDER[unit];
}

export function parseFoodServingUnit(value: string): FoodServingUnit {
  if (!isFoodServingUnit(value)) {
    throw new Error('Food serving unit is invalid');
  }
  return value;
}
