import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { GymOrg } from '../domain/gym-org.entity';
import { toGymOrgId } from '../domain/gym-org-id';
import { GymOrgName } from '../domain/gym-org-name.value-object';
import { IanaTimezone } from '../domain/iana-timezone.value-object';

type GymOrgRow = Database['public']['Tables']['gym_orgs']['Row'];

export function toGymOrg(row: GymOrgRow): GymOrg {
  try {
    return GymOrg.reconstitute({
      id: toGymOrgId(row.id),
      name: GymOrgName.create(row.name),
      address: row.address,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      logoUrl: row.logo_url,
      timezone: IanaTimezone.create(row.timezone),
      ownerUserId: toUserId(row.owner_user_id),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored gym organization is invalid', { cause: error });
  }
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
