import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { AccountLaneValue } from '../../../domain/shared/account-lane-value';
import { isRoleCode } from '../../../domain/shared/role-code';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ClientUserLookup, ClientUserRef } from '../domain/client-user-lookup';
import type { InviteeEmail } from '../domain/invitee-email.value-object';

export class SupabaseClientUserLookup implements ClientUserLookup {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findLiveByEmail(email: InviteeEmail): Promise<ClientUserRef | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id, roles!inner(code, lane)')
      .eq('email', email.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to look up user by email', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    const role = data.roles;
    if (Array.isArray(role) || role === null || typeof role !== 'object') {
      throw new TransientDatabaseFailureError('User role is invalid');
    }

    const roleCode = role.code;
    const lane = role.lane;
    if (typeof roleCode !== 'string' || !isRoleCode(roleCode)) {
      throw new TransientDatabaseFailureError('User role is invalid');
    }
    if (lane !== 'CLIENT' && lane !== 'STAFF') {
      throw new TransientDatabaseFailureError('User lane is invalid');
    }

    return {
      userId: toUserId(data.id),
      roleCode,
      lane: lane as AccountLaneValue,
    };
  }
}
