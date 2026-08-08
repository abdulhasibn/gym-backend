import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { DurationDays } from '../domain/duration-days.value-object';
import { MembershipPlan } from '../domain/membership-plan.entity';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanSummary } from '../domain/membership-plan.queries';
import { isPlanCapability } from '../domain/plan-capability';
import { isPlanKind } from '../domain/plan-kind';
import { PlanName } from '../domain/plan-name.value-object';
import { PlanPrice } from '../domain/plan-price.value-object';

type MembershipPlanRow = Database['public']['Tables']['membership_plans']['Row'];

export function toMembershipPlan(row: MembershipPlanRow): MembershipPlan {
  try {
    if (!isPlanKind(row.kind)) {
      throw new Error('Stored plan kind is invalid');
    }
    if (row.capability !== null && !isPlanCapability(row.capability)) {
      throw new Error('Stored plan capability is invalid');
    }
    return MembershipPlan.reconstitute({
      id: toMembershipPlanId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      name: PlanName.create(row.name),
      kind: row.kind,
      capability: row.capability,
      durationDays: DurationDays.create(row.duration_days),
      price: PlanPrice.create(Number(row.price)),
      active: row.active,
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored membership plan is invalid', { cause: error });
  }
}

export function toMembershipPlanSummary(row: MembershipPlanRow): MembershipPlanSummary {
  if (!isPlanKind(row.kind)) {
    throw new DataIntegrityError('Stored plan kind is invalid');
  }
  if (row.capability !== null && !isPlanCapability(row.capability)) {
    throw new DataIntegrityError('Stored plan capability is invalid');
  }
  return {
    id: toMembershipPlanId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    name: row.name,
    kind: row.kind,
    capability: row.capability,
    durationDays: row.duration_days,
    price: Number(row.price),
    active: row.active,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toMembershipPlanInsert(
  plan: MembershipPlan,
): Database['public']['Tables']['membership_plans']['Insert'] {
  return {
    id: plan.id,
    gym_org_id: plan.gymOrgId,
    name: plan.name.value,
    kind: plan.kind,
    capability: plan.capability,
    duration_days: plan.durationDays.value,
    price: plan.price.value,
    active: plan.active,
    deleted_at: plan.deletedAt?.toISOString() ?? null,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}

export function toMembershipPlanUpdate(
  plan: MembershipPlan,
): Database['public']['Tables']['membership_plans']['Update'] {
  return {
    name: plan.name.value,
    duration_days: plan.durationDays.value,
    price: plan.price.value,
    active: plan.active,
    deleted_at: plan.deletedAt?.toISOString() ?? null,
    updated_at: plan.updatedAt.toISOString(),
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
