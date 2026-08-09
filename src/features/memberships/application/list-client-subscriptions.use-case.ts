import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { SubscriptionQueries } from '../domain/subscription.queries';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toSubscriptionDtoFromSummary, type SubscriptionDto } from './subscription.dto';

export class ListClientSubscriptionsUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly subscriptionQueries: SubscriptionQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: UserId,
  ): Promise<readonly SubscriptionDto[]> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const summaries = await this.subscriptionQueries.listForClientAtGym(gymOrgId, clientUserId);
    if (summaries === null) {
      throw new NotFoundError('Active membership not found for client at this gym');
    }

    return summaries.map(toSubscriptionDtoFromSummary);
  }
}
