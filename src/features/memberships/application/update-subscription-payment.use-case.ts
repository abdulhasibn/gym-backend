import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { PaymentStatus } from '../domain/payment-status';
import type { PlanPrice } from '../domain/plan-price.value-object';
import type { SubscriptionId } from '../domain/subscription-id';
import type { SubscriptionRepository } from '../domain/subscription.repository';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toSubscriptionDto, type SubscriptionDto } from './subscription.dto';

export interface UpdateSubscriptionPaymentCommand {
  readonly gymOrgId: GymOrgId;
  readonly subscriptionId: SubscriptionId;
  readonly paymentStatus: PaymentStatus;
  readonly amountPaid: PlanPrice | null;
}

export class UpdateSubscriptionPaymentUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly subscriptions: SubscriptionRepository,
    private readonly memberships: ClientMembershipRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpdateSubscriptionPaymentCommand,
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

    subscription.setPayment(command.paymentStatus, command.amountPaid, this.clock.now());
    await this.subscriptions.save(subscription);

    return toSubscriptionDto(subscription);
  }
}
