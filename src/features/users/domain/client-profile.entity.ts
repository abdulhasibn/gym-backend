import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import { computeBmi } from './bmi';
import type { Gender } from './gender';
import { isGender } from './gender';
import type { HeightCm } from './height-cm.value-object';
import { InvalidProfileError } from './invalid-profile.error';
import type { WeightKg } from './weight-kg.value-object';

export interface ClientProfileData {
  readonly userId: UserId;
  readonly heightCm: HeightCm | null;
  readonly weightKg: WeightKg | null;
  readonly dob: CalendarDate | null;
  readonly gender: Gender | null;
  readonly medicalNotes: string | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateClientProfileInput {
  readonly heightCm: HeightCm | null;
  readonly weightKg: WeightKg | null;
  readonly dob: CalendarDate | null;
  readonly gender: Gender | null;
  readonly medicalNotes: string | null;
  readonly now: Date;
}

function assertMedicalNotes(value: string | null): void {
  if (value === null) {
    return;
  }
  if (value.length > 5000) {
    throw new InvalidProfileError('Medical notes cannot exceed 5000 characters');
  }
}

function assertProfileData(data: ClientProfileData): void {
  assertMedicalNotes(data.medicalNotes);
  if (data.gender !== null && !isGender(data.gender)) {
    throw new InvalidProfileError('Gender is invalid');
  }
}

export class ClientProfile {
  private constructor(private data: ClientProfileData) {}

  static reconstitute(data: ClientProfileData): ClientProfile {
    assertProfileData(data);
    return new ClientProfile(data);
  }

  get userId(): UserId {
    return this.data.userId;
  }

  get heightCm(): HeightCm | null {
    return this.data.heightCm;
  }

  get weightKg(): WeightKg | null {
    return this.data.weightKg;
  }

  get dob(): CalendarDate | null {
    return this.data.dob;
  }

  get gender(): Gender | null {
    return this.data.gender;
  }

  get medicalNotes(): string | null {
    return this.data.medicalNotes;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }

  /** BMI when height and weight are both set. */
  currentBmi(): number | null {
    if (this.data.heightCm === null || this.data.weightKg === null) {
      return null;
    }
    return computeBmi(this.data.heightCm, this.data.weightKg);
  }

  /**
   * Apply profile fields. Returns whether weight changed (caller upserts ProgressLog).
   */
  update(input: UpdateClientProfileInput): { weightChanged: boolean } {
    if (this.data.deletedAt !== null) {
      throw new InvalidProfileError('Cannot update a deleted profile');
    }
    assertMedicalNotes(input.medicalNotes);
    if (input.gender !== null && !isGender(input.gender)) {
      throw new InvalidProfileError('Gender is invalid');
    }

    const previousWeight = this.data.weightKg?.value ?? null;
    const nextWeight = input.weightKg?.value ?? null;
    const weightChanged = previousWeight !== nextWeight;

    this.data = {
      ...this.data,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      dob: input.dob,
      gender: input.gender,
      medicalNotes: input.medicalNotes,
      updatedAt: input.now,
    };
    return { weightChanged };
  }
}
