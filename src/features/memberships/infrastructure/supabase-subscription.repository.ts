import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { CalendarDate } from '../domain/calendar-date.value-object';
import type { MembershipId } from '../domain/membership-id';
import type { Subscription } from '../domain/subscription.entity';
import type { SubscriptionId } from '../domain/subscription-id';
import type { SubscriptionRepository } from '../domain/subscription.repository';
import { toSubscription, toSubscriptionUpdate } from './subscription.mapper';

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(gymOrgId: GymOrgId, subscriptionId: SubscriptionId): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', subscriptionId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read subscription', { cause: error });
    }
    if (data === null) {
      return null;
    }

    return toSubscription(data);
  }

  async findInDateCoachingAddon(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
    today: CalendarDate,
  ): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('client_membership_id', membershipId)
      .eq('kind', 'ADDON')
      .eq('capability', 'TRAINER_COACHING')
      .is('deleted_at', null)
      .not('start_date', 'is', null)
      .lte('start_date', today.value)
      .gte('end_date', today.value)
      .limit(1)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read coaching addon subscription', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return toSubscription(data);
  }

  async save(subscription: Subscription): Promise<void> {
    const { data, error } = await this.client
      .from('subscriptions')
      .update(toSubscriptionUpdate(subscription))
      .eq('id', subscription.id)
      .eq('gym_org_id', subscription.gymOrgId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      throw translateSubscriptionWriteError(error);
    }
    if (data === null) {
      throw new NotFoundError('Subscription not found');
    }
  }
}

function translateSubscriptionWriteError(error: { code?: string; message?: string }): Error {
  const code = error.code ?? '';
  const message = error.message ?? '';

  // exclusion_violation — overlapping dated subscription lines (ADR-0004)
  if (code === '23P01' || message.includes('subscriptions_no_overlap')) {
    throw new ConflictError('Subscription date range overlaps an existing live line');
  }
  // unique_violation — one unstarted BASE per membership
  if (code === '23505' || message.includes('subscriptions_one_unstarted_base')) {
    throw new UniqueViolationError('Membership already has an unstarted BASE subscription');
  }
  // check_violation — payment / date CHECKs
  if (code === '23514' || message.includes('subscriptions_')) {
    throw new ConflictError(message || 'Subscription update violates a database constraint');
  }

  throw new TransientDatabaseFailureError('Unable to save subscription', { cause: error });
}
