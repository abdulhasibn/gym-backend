import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { HeightCm } from './height-cm.value-object';
import type { ProgressLogId } from './progress-log-id';
import type { WeightKg } from './weight-kg.value-object';
import { computeBmi } from './bmi';

export interface ProgressLogData {
  readonly id: ProgressLogId;
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly weightKg: WeightKg | null;
  readonly bmi: number | null;
  readonly notes: string | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
}

export interface CreateProgressLogProps {
  readonly id: ProgressLogId;
  readonly clientUserId: UserId;
  readonly logDate: CalendarDate;
  readonly weightKg: WeightKg | null;
  readonly heightCm: HeightCm | null;
  readonly notes: string | null;
  readonly now: Date;
}

export class ProgressLog {
  private constructor(private data: ProgressLogData) {}

  static create(props: CreateProgressLogProps): ProgressLog {
    const bmi =
      props.weightKg !== null && props.heightCm !== null
        ? computeBmi(props.heightCm, props.weightKg)
        : null;
    return new ProgressLog({
      id: props.id,
      clientUserId: props.clientUserId,
      logDate: props.logDate,
      weightKg: props.weightKg,
      bmi,
      notes: props.notes,
      deletedAt: null,
      createdAt: props.now,
    });
  }

  static reconstitute(data: ProgressLogData): ProgressLog {
    return new ProgressLog(data);
  }

  get id(): ProgressLogId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get logDate(): CalendarDate {
    return this.data.logDate;
  }

  get weightKg(): WeightKg | null {
    return this.data.weightKg;
  }

  get bmi(): number | null {
    return this.data.bmi;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }

  /**
   * Update weight/notes for same log date; recalculates BMI from current height.
   */
  applyWeight(weightKg: WeightKg | null, heightCm: HeightCm | null, notes: string | null): void {
    const bmi = weightKg !== null && heightCm !== null ? computeBmi(heightCm, weightKg) : null;
    this.data = {
      ...this.data,
      weightKg,
      bmi,
      notes,
    };
  }
}
