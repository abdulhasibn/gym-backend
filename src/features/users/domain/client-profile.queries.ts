import type { UserId } from '../../../domain/shared/user-id';
import type { Gender } from './gender';

export interface ClientProfileSummary {
  readonly userId: UserId;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly dob: string | null;
  readonly gender: Gender | null;
  readonly medicalNotes: string | null;
  readonly bmi: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClientProfileQueries {
  get(userId: UserId): Promise<ClientProfileSummary | null>;
}
