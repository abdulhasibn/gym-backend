import type { HeightCm } from './height-cm.value-object';
import type { WeightKg } from './weight-kg.value-object';

/**
 * BMI = weight_kg / (height_m)^2, rounded to 1 decimal.
 */
export function computeBmi(height: HeightCm, weight: WeightKg): number {
  const heightM = height.value / 100;
  const bmi = weight.value / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}
