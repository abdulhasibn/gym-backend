export interface NutrientsPer100g {
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
}

export interface ScaledNutrients {
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
}

export function scaleNutrients(
  per100g: NutrientsPer100g,
  grams: number,
  quantity: number,
): ScaledNutrients {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error('Serving grams must be greater than 0');
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Serving quantity must be greater than 0');
  }
  const factor = (grams * quantity) / 100;
  return {
    calories: round2(per100g.calories * factor),
    proteinG: round2(per100g.proteinG * factor),
    carbsG: round2(per100g.carbsG * factor),
    fatG: round2(per100g.fatG * factor),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
