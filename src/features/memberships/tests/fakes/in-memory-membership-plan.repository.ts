import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { MembershipPlan } from '../../domain/membership-plan.entity';
import type { MembershipPlanId } from '../../domain/membership-plan-id';
import type {
  ListMembershipPlansCriteria,
  MembershipPlanQueries,
  MembershipPlanSummary,
} from '../../domain/membership-plan.queries';
import type { MembershipPlanRepository } from '../../domain/membership-plan.repository';

function toSummary(plan: MembershipPlan): MembershipPlanSummary {
  return {
    id: plan.id,
    gymOrgId: plan.gymOrgId,
    name: plan.name.value,
    kind: plan.kind,
    capability: plan.capability,
    durationDays: plan.durationDays.value,
    price: plan.price.value,
    active: plan.active,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export class InMemoryMembershipPlanStore
  implements MembershipPlanRepository, MembershipPlanQueries
{
  private readonly byId = new Map<string, MembershipPlan>();

  async findById(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlan | null> {
    const plan = this.byId.get(planId);
    if (plan === undefined || plan.gymOrgId !== gymOrgId || plan.isDeleted) {
      return null;
    }
    return plan;
  }

  async save(plan: MembershipPlan): Promise<void> {
    this.byId.set(plan.id, plan);
  }

  async get(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlanSummary | null> {
    const plan = await this.findById(gymOrgId, planId);
    return plan === null ? null : toSummary(plan);
  }

  async list(
    criteria: ListMembershipPlansCriteria,
    page: Pagination,
  ): Promise<Page<MembershipPlanSummary>> {
    const items = [...this.byId.values()]
      .filter(
        (plan) =>
          plan.gymOrgId === criteria.gymOrgId &&
          !plan.isDeleted &&
          (criteria.kind === undefined || plan.kind === criteria.kind) &&
          (criteria.active === undefined || plan.active === criteria.active),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toSummary);

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}
