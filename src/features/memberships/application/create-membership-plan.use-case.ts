import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { MembershipPlan } from '../domain/membership-plan.entity';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanRepository } from '../domain/membership-plan.repository';
import type { DurationDays } from '../domain/duration-days.value-object';
import type { PlanCapability } from '../domain/plan-capability';
import type { PlanKind } from '../domain/plan-kind';
import type { PlanName } from '../domain/plan-name.value-object';
import type { PlanPrice } from '../domain/plan-price.value-object';
import { toMembershipPlanDto, type MembershipPlanDto } from './membership-plan.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export interface CreateMembershipPlanCommand {
  readonly gymOrgId: GymOrgId;
  readonly name: PlanName;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly durationDays: DurationDays;
  readonly price: PlanPrice;
}

export class CreateMembershipPlanUseCase {
  constructor(
    private readonly plans: MembershipPlanRepository,
    private readonly policy: PlanAdminPolicy,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: CreateMembershipPlanCommand,
  ): Promise<MembershipPlanDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const plan = MembershipPlan.create({
      id: toMembershipPlanId(this.ids.generate()),
      gymOrgId: command.gymOrgId,
      name: command.name,
      kind: command.kind,
      capability: command.capability,
      durationDays: command.durationDays,
      price: command.price,
      now: this.clock.now(),
    });
    await this.plans.save(plan);

    return toMembershipPlanDto(plan);
  }
}
