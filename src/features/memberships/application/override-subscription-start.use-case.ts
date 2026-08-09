import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CalendarDate } from '../domain/calendar-date.value-object';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { SubscriptionId } from '../domain/subscription-id';
import type { SubscriptionRepository } from '../domain/subscription.repository';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toSubscriptionDto, type SubscriptionDto } from './subscription.dto';

export interface OverrideSubscriptionStartCommand {
  readonly gymOrgId: GymOrgId;
  readonly subscriptionId: SubscriptionId;
  readonly startDate: CalendarDate;
}

export class OverrideSubscriptionStartUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly subscriptions: SubscriptionRepository,
    private readonly memberships: ClientMembershipRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: OverrideSubscriptionStartCommand,
  ): Promise<SubscriptionDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const subscription = await this.subscriptions.findById(
      command.gymOrgId,
      command.subscriptionId,
    );
    if (subscription === null || subscription.isDeleted) {
      throw new NotFoundError('Subscription not found');
    }

    const membership = await this.memberships.findById(
      command.gymOrgId,
      subscription.clientMembershipId,
    );
    if (membership === null || !membership.isActive) {
      throw new NotFoundError('Active membership not found for subscription');
    }

    subscription.overrideStart(command.startDate, this.clock.now());
    await this.subscriptions.save(subscription);

    return toSubscriptionDto(subscription);
  }
}
