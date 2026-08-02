import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../infrastructure/supabase/database.types';
import type { AuthUserQueries, AuthUserView } from '../domain/auth-user.queries';
import type { AuthUserId } from '../domain/user.entity';
import { readAuthUserById } from './auth-user.row-reader';

export class SupabaseAuthUserQueries implements AuthUserQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findAuthUserById(id: AuthUserId): Promise<AuthUserView | null> {
    const user = await readAuthUserById(this.client, id);

    if (user === null) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      lane: user.lane.value,
      roleCode: user.roleCode,
      staffCode: user.staffCode,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    };
  }
}
