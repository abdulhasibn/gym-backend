import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { computeBmi } from '../domain/bmi';
import { ClientProfile } from '../domain/client-profile.entity';
import type { ClientProfileSummary } from '../domain/client-profile.queries';
import { isGender } from '../domain/gender';
import { HeightCm } from '../domain/height-cm.value-object';
import { ProgressLog } from '../domain/progress-log.entity';
import { toProgressLogId } from '../domain/progress-log-id';
import type { ProgressLogSummary } from '../domain/progress-log.queries';
import { WeightKg } from '../domain/weight-kg.value-object';

type ProfileRow = Database['public']['Tables']['client_profiles']['Row'];
type ProgressRow = Database['public']['Tables']['progress_logs']['Row'];

export function toClientProfile(row: ProfileRow): ClientProfile {
  try {
    if (row.gender !== null && !isGender(row.gender)) {
      throw new Error('Stored gender is invalid');
    }
    return ClientProfile.reconstitute({
      userId: toUserId(row.user_id),
      heightCm: row.height_cm === null ? null : HeightCm.create(Number(row.height_cm)),
      weightKg: row.weight_kg === null ? null : WeightKg.create(Number(row.weight_kg)),
      dob: row.dob === null ? null : CalendarDate.create(row.dob),
      gender: row.gender,
      medicalNotes: row.medical_notes,
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored client profile is invalid', { cause: error });
  }
}

export function toClientProfileSummary(row: ProfileRow): ClientProfileSummary {
  const heightCm = row.height_cm === null ? null : Number(row.height_cm);
  const weightKg = row.weight_kg === null ? null : Number(row.weight_kg);
  let bmi: number | null = null;
  if (heightCm !== null && weightKg !== null) {
    bmi = computeBmi(HeightCm.create(heightCm), WeightKg.create(weightKg));
  }
  if (row.gender !== null && !isGender(row.gender)) {
    throw new DataIntegrityError('Stored gender is invalid');
  }
  return {
    userId: toUserId(row.user_id),
    heightCm,
    weightKg,
    dob: row.dob,
    gender: row.gender,
    medicalNotes: row.medical_notes,
    bmi,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toClientProfileUpdate(
  profile: ClientProfile,
): Database['public']['Tables']['client_profiles']['Update'] {
  return {
    height_cm: profile.heightCm?.value ?? null,
    weight_kg: profile.weightKg?.value ?? null,
    dob: profile.dob?.value ?? null,
    gender: profile.gender,
    medical_notes: profile.medicalNotes,
    deleted_at: profile.deletedAt?.toISOString() ?? null,
    updated_at: profile.updatedAt.toISOString(),
  };
}

export function toProgressLog(row: ProgressRow): ProgressLog {
  try {
    return ProgressLog.reconstitute({
      id: toProgressLogId(row.id),
      clientUserId: toUserId(row.client_user_id),
      logDate: CalendarDate.create(row.log_date),
      weightKg: row.weight_kg === null ? null : WeightKg.create(Number(row.weight_kg)),
      bmi: row.bmi === null ? null : Number(row.bmi),
      notes: row.notes,
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored progress log is invalid', { cause: error });
  }
}

export function toProgressLogSummary(row: ProgressRow): ProgressLogSummary {
  return {
    id: toProgressLogId(row.id),
    clientUserId: toUserId(row.client_user_id),
    logDate: row.log_date,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    bmi: row.bmi === null ? null : Number(row.bmi),
    notes: row.notes,
    createdAt: toValidDate(row.created_at).toISOString(),
  };
}

export function toProgressLogInsert(
  log: ProgressLog,
): Database['public']['Tables']['progress_logs']['Insert'] {
  return {
    id: log.id,
    client_user_id: log.clientUserId,
    log_date: log.logDate.value,
    weight_kg: log.weightKg?.value ?? null,
    bmi: log.bmi,
    notes: log.notes,
    deleted_at: log.deletedAt?.toISOString() ?? null,
    created_at: log.createdAt.toISOString(),
  };
}

export function toProgressLogUpdate(
  log: ProgressLog,
): Database['public']['Tables']['progress_logs']['Update'] {
  return {
    weight_kg: log.weightKg?.value ?? null,
    bmi: log.bmi,
    notes: log.notes,
    deleted_at: log.deletedAt?.toISOString() ?? null,
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
