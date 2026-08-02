import type { Database } from '../../../infrastructure/supabase/database.types';
import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { isRoleCode } from '../../../domain/shared/role-code';
import { AccountLane } from '../domain/account-lane.value-object';
import { EmailAddress } from '../domain/email-address.value-object';
import { AuthUser, toAuthUserId } from '../domain/user.entity';

type UserRow = Database['public']['Tables']['users']['Row'];

export function toAuthUser(row: UserRow, roleCode: string, lane: string): AuthUser {
  if (!isRoleCode(roleCode)) {
    throw new DataIntegrityError(`Unsupported role code: ${roleCode}`);
  }

  try {
    return AuthUser.reconstitute({
      id: toAuthUserId(row.id),
      roleCode,
      lane: AccountLane.create(lane),
      name: row.name,
      email: EmailAddress.create(row.email),
      emailVerifiedAt: row.email_verified_at === null ? null : new Date(row.email_verified_at),
      googleId: row.google_id,
      staffCode: row.staff_code,
    });
  } catch (error) {
    throw new DataIntegrityError('Stored auth user is invalid', { cause: error });
  }
}
