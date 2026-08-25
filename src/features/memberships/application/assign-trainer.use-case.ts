import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { LiveTrainerProfilePort } from '../domain/live-trainer-profile.port';
import type { MembershipId } from '../domain/membership-id';
import type { SubscriptionRepository } from '../domain/subscription.repository';
import type { TrainerProfileId } from '../domain/trainer-profile-id';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toMembershipMutationDto, type MembershipMutationDto } from './roster.dto';

export interface AssignTrainerCommand {
  readonly gymOrgId: GymOrgId;
  readonly membershipId: MembershipId;
  readonly trainerProfileId: TrainerProfileId;
}

export class AssignTrainerUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly memberships: ClientMembershipRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly trainers: LiveTrainerProfilePort,
    private readonly clock: Clock,
    private readonly gymClock: GymLocalClock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: AssignTrainerCommand,
  ): Promise<MembershipMutationDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const membership = await this.memberships.findById(command.gymOrgId, command.membershipId);
    if (membership === null || !membership.isActive) {
      throw new NotFoundError('Active membership not found');
    }

    const today = await this.gymClock.today(command.gymOrgId, this.clock.now());
    const coachingAddon = await this.subscriptions.findInDateCoachingAddon(
      command.gymOrgId,
      membership.id,
      today,
    );
    if (coachingAddon === null || !coachingAddon.isInDate(today)) {
      throw new CoachingAddonRequiredError();
    }

    const trainerLive = await this.trainers.isLiveAtGym(command.trainerProfileId, command.gymOrgId);
    if (!trainerLive) {
      throw new NotFoundError('Trainer profile not found at this gym');
    }

    const now = this.clock.now();
    membership.assignTrainer(command.trainerProfileId, now);
    await this.memberships.save(membership);

    return toMembershipMutationDto(membership);
  }
}
