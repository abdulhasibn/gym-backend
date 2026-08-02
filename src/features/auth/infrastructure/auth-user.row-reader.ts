import type { SupabaseClient } from '@supabase/supabase-js';

import { DatabaseUnavailableError } from '../../../domain/errors/database-unavailable.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { AuthUser, AuthUserId } from '../domain/user.entity';
import { toAuthUser } from './auth-user.mapper';

export async function readAuthUserById(
  client: SupabaseClient<Database>,
  id: AuthUserId,
): Promise<AuthUser | null> {
  const { data: user, error } = await client
    .from('users')
    .select('*, roles!inner(code, lane)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error !== null) {
    throw new DatabaseUnavailableError();
  }
  if (user === null) {
    return null;
  }

  const role = user.roles;
  if (Array.isArray(role)) {
    throw new DatabaseUnavailableError();
  }

  return toAuthUser(user, role.code, role.lane);
}
