import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ClientProfileRepository } from '../domain/client-profile.repository';
import type { Gender } from '../domain/gender';
import { HeightCm } from '../domain/height-cm.value-object';
import { ProgressLog } from '../domain/progress-log.entity';
import { toProgressLogId } from '../domain/progress-log-id';
import type { ProgressLogRepository } from '../domain/progress-log.repository';
import { WeightKg } from '../domain/weight-kg.value-object';
import { ClientSelfPolicy } from './client-self.policy';
import { toClientProfileDto, type ClientProfileDto } from './users.dto';

export interface UpdateMyProfileCommand {
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly dob: string | null;
  readonly gender: Gender | null;
  readonly medicalNotes: string | null;
}

function calendarDateFromUtc(now: Date): CalendarDate {
  const yyyy = String(now.getUTCFullYear()).padStart(4, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return CalendarDate.create(`${yyyy}-${mm}-${dd}`);
}

export class UpdateMyProfileUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly profiles: ClientProfileRepository,
    private readonly progressLogs: ProgressLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpdateMyProfileCommand,
  ): Promise<ClientProfileDto> {
    this.policy.requireClientSelf(actor);

    const profile = await this.profiles.findByUserId(actor.userId);
    if (profile === null || profile.isDeleted) {
      throw new NotFoundError('Client profile not found');
    }

    const now = this.clock.now();
    const heightCm = command.heightCm === null ? null : HeightCm.create(command.heightCm);
    const weightKg = command.weightKg === null ? null : WeightKg.create(command.weightKg);
    const dob = command.dob === null ? null : CalendarDate.create(command.dob);

    const { weightChanged } = profile.update({
      heightCm,
      weightKg,
      dob,
      gender: command.gender,
      medicalNotes: command.medicalNotes,
      now,
    });

    await this.profiles.save(profile);

    if (weightChanged && weightKg !== null) {
      const today = calendarDateFromUtc(now);
      const existing = await this.progressLogs.findByClientAndDate(actor.userId, today);
      if (existing === null) {
        const log = ProgressLog.create({
          id: toProgressLogId(this.ids.generate()),
          clientUserId: actor.userId,
          logDate: today,
          weightKg,
          heightCm: profile.heightCm,
          notes: null,
          now,
        });
        await this.progressLogs.save(log);
      } else {
        existing.applyWeight(weightKg, profile.heightCm, existing.notes);
        await this.progressLogs.save(existing);
      }
    }

    return toClientProfileDto({
      userId: profile.userId,
      heightCm: profile.heightCm?.value ?? null,
      weightKg: profile.weightKg?.value ?? null,
      dob: profile.dob?.value ?? null,
      gender: profile.gender,
      medicalNotes: profile.medicalNotes,
      bmi: profile.currentBmi(),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
  }
}
