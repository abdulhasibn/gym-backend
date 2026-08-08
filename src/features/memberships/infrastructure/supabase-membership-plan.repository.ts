import type { SupabaseClient } from '@supabase/supabase-js';

import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { MembershipPlan } from '../domain/membership-plan.entity';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanRepository } from '../domain/membership-plan.repository';
import {
  toMembershipPlan,
  toMembershipPlanInsert,
  toMembershipPlanUpdate,
} from './membership-plan.mapper';

export class SupabaseMembershipPlanRepository implements MembershipPlanRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlan | null> {
    const { data, error } = await this.client
      .from('membership_plans')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', planId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read membership plan', { cause: error });
    }
    if (data === null) {
      return null;
    }

    return toMembershipPlan(data);
  }

  async save(plan: MembershipPlan): Promise<void> {
    const { data: existing, error: readError } = await this.client
      .from('membership_plans')
      .select('id')
      .eq('id', plan.id)
      .eq('gym_org_id', plan.gymOrgId)
      .maybeSingle();

    if (readError !== null) {
      throw new TransientDatabaseFailureError('Unable to read membership plan before save', {
        cause: readError,
      });
    }

    if (existing === null) {
      const { error } = await this.client
        .from('membership_plans')
        .insert(toMembershipPlanInsert(plan));
      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to create membership plan', {
          cause: error,
        });
      }
      return;
    }

    const { data, error } = await this.client
      .from('membership_plans')
      .update(toMembershipPlanUpdate(plan))
      .eq('id', plan.id)
      .eq('gym_org_id', plan.gymOrgId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to save membership plan', { cause: error });
    }
    if (data === null) {
      throw new NotFoundError('Membership plan not found');
    }
  }
}
