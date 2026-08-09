import type { Brand } from '../../../shared/primitives/brand';

export type SubscriptionId = Brand<string, 'SubscriptionId'>;

export function toSubscriptionId(value: string): SubscriptionId {
  return value as SubscriptionId;
}
