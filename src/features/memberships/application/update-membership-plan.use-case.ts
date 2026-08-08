import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanRepository } from '../domain/membership-plan.repository';
import type { DurationDays } from '../domain/duration-days.value-object';
import type { PlanName } from '../domain/plan-name.value-object';
import type { PlanPrice } from '../domain/plan-price.value-object';
import { toMembershipPlanDto, type MembershipPlanDto } from './membership-plan.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export interface UpdateMembershipPlanCommand {
  readonly gymOrgId: GymOrgId;
  readonly planId: MembershipPlanId;
  readonly name: PlanName;
  readonly durationDays: DurationDays;
  readonly price: PlanPrice;
  readonly active: boolean;
}

export class UpdateMembershipPlanUseCase {
  constructor(
    private readonly plans: MembershipPlanRepository,
    private readonly policy: PlanAdminPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpdateMembershipPlanCommand,
  ): Promise<MembershipPlanDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const plan = await this.plans.findById(command.gymOrgId, command.planId);
    if (plan === null) {
      throw new NotFoundError('Membership plan not found');
    }

    plan.updateProfile(
      {
        name: command.name,
        durationDays: command.durationDays,
        price: command.price,
        active: command.active,
      },
      this.clock.now(),
    );
    await this.plans.save(plan);

    return toMembershipPlanDto(plan);
  }
}
