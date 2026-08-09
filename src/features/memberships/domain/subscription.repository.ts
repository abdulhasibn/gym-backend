import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Subscription } from './subscription.entity';
import type { SubscriptionId } from './subscription-id';

export interface SubscriptionRepository {
  findById(gymOrgId: GymOrgId, subscriptionId: SubscriptionId): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<void>;
}
