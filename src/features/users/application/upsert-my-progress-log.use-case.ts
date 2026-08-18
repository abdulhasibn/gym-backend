import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ClientProfileRepository } from '../domain/client-profile.repository';
import { ProgressLog } from '../domain/progress-log.entity';
import { toProgressLogId } from '../domain/progress-log-id';
import type { ProgressLogRepository } from '../domain/progress-log.repository';
import { WeightKg } from '../domain/weight-kg.value-object';
import { ClientSelfPolicy } from './client-self.policy';
import type { SyncWearableWeightUseCase } from './sync-wearable-weight.use-case';
import { toProgressLogDto, type ProgressLogDto } from './users.dto';

export interface UpsertMyProgressLogCommand {
  readonly logDate: string;
  readonly weightKg: number | null;
  readonly notes: string | null;
}

export class UpsertMyProgressLogUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly profiles: ClientProfileRepository,
    private readonly progressLogs: ProgressLogRepository,
    private readonly syncWearableWeight: SyncWearableWeightUseCase,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpsertMyProgressLogCommand,
  ): Promise<ProgressLogDto> {
    this.policy.requireClientSelf(actor);

    const profile = await this.profiles.findByUserId(actor.userId);
    if (profile === null || profile.isDeleted) {
      throw new NotFoundError('Client profile not found');
    }

    const now = this.clock.now();
    const logDate = CalendarDate.create(command.logDate);
    const weightKg = command.weightKg === null ? null : WeightKg.create(command.weightKg);

    if (weightKg !== null) {
      await this.syncWearableWeight.upsert(actor.userId, logDate, weightKg.value);
      const log = await this.progressLogs.findByClientAndDate(actor.userId, logDate);
      if (log === null) {
        throw new NotFoundError('Progress log not found after weight sync');
      }
      if (command.notes !== log.notes) {
        log.applyWeight(log.weightKg, profile.heightCm, command.notes);
        await this.progressLogs.save(log);
      }
      return toProgressLogDto({
        id: log.id,
        clientUserId: log.clientUserId,
        logDate: log.logDate.value,
        weightKg: log.weightKg?.value ?? null,
        bmi: log.bmi,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
      });
    }

    let log = await this.progressLogs.findByClientAndDate(actor.userId, logDate);
    if (log === null) {
      log = ProgressLog.create({
        id: toProgressLogId(this.ids.generate()),
        clientUserId: actor.userId,
        logDate,
        weightKg: null,
        heightCm: profile.heightCm,
        notes: command.notes,
        now,
      });
    } else {
      log.applyWeight(null, profile.heightCm, command.notes);
    }
    await this.progressLogs.save(log);

    return toProgressLogDto({
      id: log.id,
      clientUserId: log.clientUserId,
      logDate: log.logDate.value,
      weightKg: log.weightKg?.value ?? null,
      bmi: log.bmi,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    });
  }
}
