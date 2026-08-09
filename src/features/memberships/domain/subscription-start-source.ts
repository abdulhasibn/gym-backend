export const SUBSCRIPTION_START_SOURCES = [
  'FIRST_ATTENDANCE',
  'ADMIN_OVERRIDE',
  'ADMIN_ATTACH',
] as const;

export type SubscriptionStartSource = (typeof SUBSCRIPTION_START_SOURCES)[number];

export function isSubscriptionStartSource(value: string): value is SubscriptionStartSource {
  return (SUBSCRIPTION_START_SOURCES as readonly string[]).includes(value);
}
