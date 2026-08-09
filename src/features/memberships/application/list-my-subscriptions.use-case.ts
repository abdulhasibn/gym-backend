import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { SubscriptionQueries } from '../domain/subscription.queries';
import { SubscriptionForbiddenError } from './subscription-forbidden.error';
import { toSubscriptionDtoFromSummary, type SubscriptionDto } from './subscription.dto';

export class ListMySubscriptionsUseCase {
  constructor(private readonly subscriptionQueries: SubscriptionQueries) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
  ): Promise<readonly SubscriptionDto[]> {
    if (actor.lane !== 'CLIENT') {
      throw new SubscriptionForbiddenError('Only client accounts can view their subscriptions');
    }

    const summaries = await this.subscriptionQueries.listForClientAtGym(gymOrgId, actor.userId);
    if (summaries === null) {
      throw new NotFoundError('Active membership not found at this gym');
    }

    return summaries.map(toSubscriptionDtoFromSummary);
  }
}
