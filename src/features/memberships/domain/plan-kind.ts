export const PLAN_KINDS = ['BASE', 'ADDON'] as const;

export type PlanKind = (typeof PLAN_KINDS)[number];

export function isPlanKind(value: string): value is PlanKind {
  return (PLAN_KINDS as readonly string[]).includes(value);
}
