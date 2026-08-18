import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ClientProfileRepository } from '../domain/client-profile.repository';
import { ProgressLog } from '../domain/progress-log.entity';
import { toProgressLogId } from '../domain/progress-log-id';
import type { ProgressLogRepository } from '../domain/progress-log.repository';
import { WeightKg } from '../domain/weight-kg.value-object';

export class SyncWearableWeightUseCase {
  constructor(
    private readonly profiles: ClientProfileRepository,
    private readonly progressLogs: ProgressLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async upsert(clientUserId: UserId, logDate: CalendarDate, weightKg: number): Promise<void> {
    const profile = await this.profiles.findByUserId(clientUserId);
    if (profile === null || profile.isDeleted) {
      throw new NotFoundError('Client profile not found');
    }

    const weight = WeightKg.create(weightKg);
    const now = this.clock.now();

    let log = await this.progressLogs.findByClientAndDate(clientUserId, logDate);
    if (log === null) {
      log = ProgressLog.create({
        id: toProgressLogId(this.ids.generate()),
        clientUserId,
        logDate,
        weightKg: weight,
        heightCm: profile.heightCm,
        notes: null,
        now,
      });
    } else {
      log.applyWeight(weight, profile.heightCm, log.notes);
    }
    await this.progressLogs.save(log);

    profile.update({
      heightCm: profile.heightCm,
      weightKg: weight,
      dob: profile.dob,
      gender: profile.gender,
      medicalNotes: profile.medicalNotes,
      now,
    });
    await this.profiles.save(profile);
  }
}
