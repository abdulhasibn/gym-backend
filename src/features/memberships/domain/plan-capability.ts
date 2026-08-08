export const PLAN_CAPABILITIES = ['TRAINER_COACHING'] as const;

export type PlanCapability = (typeof PLAN_CAPABILITIES)[number];

export function isPlanCapability(value: string): value is PlanCapability {
  return (PLAN_CAPABILITIES as readonly string[]).includes(value);
}
