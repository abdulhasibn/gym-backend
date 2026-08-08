export const DATA_GRANT_CLASSES = [
  'PROGRESS',
  'CALORIES',
  'WEARABLES',
  'DIET_PLANS',
  'WORKOUT_PLANS',
] as const;

export type DataGrantClass = (typeof DATA_GRANT_CLASSES)[number];

export function isDataGrantClass(value: string): value is DataGrantClass {
  return (DATA_GRANT_CLASSES as readonly string[]).includes(value);
}
