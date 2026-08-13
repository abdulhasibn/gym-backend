import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toUserId } from '../../../../domain/shared/user-id';
import { computeBmi } from '../../domain/bmi';
import { ClientProfile } from '../../domain/client-profile.entity';
import { HeightCm } from '../../domain/height-cm.value-object';
import { ProgressLog } from '../../domain/progress-log.entity';
import { toProgressLogId } from '../../domain/progress-log-id';
import { WeightKg } from '../../domain/weight-kg.value-object';

const now = new Date('2026-08-11T00:00:00.000Z');
const userId = toUserId('11111111-1111-4111-8111-111111111111');

describe('BMI', () => {
  it('computes BMI from height and weight', () => {
    expect(computeBmi(HeightCm.create(170), WeightKg.create(68))).toBe(23.5);
  });
});

describe('ClientProfile', () => {
  it('updates fields and detects weight change', () => {
    const profile = ClientProfile.reconstitute({
      userId,
      heightCm: HeightCm.create(170),
      weightKg: WeightKg.create(70),
      dob: CalendarDate.create('1990-01-01'),
      gender: 'MALE',
      medicalNotes: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(profile.currentBmi()).toBe(24.2);

    const { weightChanged } = profile.update({
      heightCm: HeightCm.create(170),
      weightKg: WeightKg.create(68),
      dob: CalendarDate.create('1990-01-01'),
      gender: 'MALE',
      medicalNotes: 'knee',
      now,
    });
    expect(weightChanged).toBe(true);
    expect(profile.weightKg?.value).toBe(68);
  });
});

describe('ProgressLog', () => {
  it('derives BMI at create when height present', () => {
    const log = ProgressLog.create({
      id: toProgressLogId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: userId,
      logDate: CalendarDate.create('2026-08-11'),
      weightKg: WeightKg.create(68),
      heightCm: HeightCm.create(170),
      notes: null,
      now,
    });
    expect(log.bmi).toBe(23.5);
  });
});
