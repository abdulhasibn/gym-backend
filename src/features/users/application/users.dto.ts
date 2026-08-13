import type { ClientProfileSummary } from '../domain/client-profile.queries';
import type { ProgressLogSummary } from '../domain/progress-log.queries';

export interface ClientProfileDto {
  readonly userId: string;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly dob: string | null;
  readonly gender: string | null;
  readonly medicalNotes: string | null;
  readonly bmi: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProgressLogDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly logDate: string;
  readonly weightKg: number | null;
  readonly bmi: number | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export function toClientProfileDto(summary: ClientProfileSummary): ClientProfileDto {
  return {
    userId: summary.userId,
    heightCm: summary.heightCm,
    weightKg: summary.weightKg,
    dob: summary.dob,
    gender: summary.gender,
    medicalNotes: summary.medicalNotes,
    bmi: summary.bmi,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export function toProgressLogDto(summary: ProgressLogSummary): ProgressLogDto {
  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    logDate: summary.logDate,
    weightKg: summary.weightKg,
    bmi: summary.bmi,
    notes: summary.notes,
    createdAt: summary.createdAt,
  };
}
