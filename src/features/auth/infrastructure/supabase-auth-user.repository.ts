import type { SupabaseClient } from '@supabase/supabase-js';

import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { roleCodeForLane } from '../domain/account-lane.value-object';
import type { EmailAddress } from '../domain/email-address.value-object';
import type { AuthUserRepository, CreateAuthUser } from '../domain/user.repository';
import type { AuthUser, AuthUserId } from '../domain/user.entity';
import { toAuthUser } from './auth-user.mapper';
import { readAuthUserById } from './auth-user.row-reader';

export class SupabaseAuthUserRepository implements AuthUserRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: AuthUserId): Promise<AuthUser | null> {
    return readAuthUserById(this.client, id);
  }

  async existsByEmail(email: EmailAddress): Promise<boolean> {
    const { data, error } = await this.client
      .from('users')
      .select('id')
      .eq('email', email.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to look up account by email', {
        cause: error,
      });
    }

    return data !== null;
  }

  async create(command: CreateAuthUser): Promise<AuthUser> {
    const role = await this.findRoleByCode(roleCodeForLane(command.lane));
    const { data, error } = await this.client
      .from('users')
      .insert({
        id: command.id,
        role_id: role.id,
        name: command.name,
        email: command.email.value,
        email_verified_at: command.emailVerifiedAt.toISOString(),
        google_id: command.googleId,
        staff_code: command.staffCode,
      })
      .select('*')
      .single();

    if (error !== null) {
      if (isUniqueViolation(error)) {
        throw new UniqueViolationError('An account with this identity already exists');
      }
      throw new TransientDatabaseFailureError('Unable to create account', { cause: error });
    }

    return toAuthUser(data, role.code, role.lane);
  }

  async linkGoogleIdentity(id: AuthUserId, googleId: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({ google_id: googleId })
      .eq('id', id)
      .is('deleted_at', null);

    if (error !== null) {
      if (isUniqueViolation(error)) {
        throw new UniqueViolationError('This Google identity is already linked to another account');
      }
      throw new TransientDatabaseFailureError('Unable to link Google identity', { cause: error });
    }
  }

  private async findRoleByCode(
    code: 'CLIENT' | 'STAFF_UNASSIGNED',
  ): Promise<{ readonly id: string; readonly code: string; readonly lane: string }> {
    const { data, error } = await this.client
      .from('roles')
      .select('id, code, lane')
      .eq('code', code)
      .maybeSingle();
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read role', { cause: error });
    }
    if (data === null) {
      throw new DataIntegrityError(`Frozen role is missing: ${code}`);
    }
    return { id: data.id, code: data.code, lane: data.lane };
  }
}

function isUniqueViolation(error: {
  readonly code?: string | null;
  readonly message?: string | null;
  readonly details?: string | null;
}): boolean {
  if (error.code === '23505') {
    return true;
  }

  return [error.message, error.details].some(
    (value) =>
      value !== null && value !== undefined && /unique constraint|duplicate key/i.test(value),
  );
}
