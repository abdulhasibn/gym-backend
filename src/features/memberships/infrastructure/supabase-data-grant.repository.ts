import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { DataGrantClass } from '../domain/data-grant-class';
import type { DataGrantsSnapshot } from '../domain/data-grant.queries';
import type { DataGrantRepository } from '../domain/data-grant.repository';
import type { GrantChecklist } from '../domain/grant-checklist';
import type { OptionalProfileAttribute } from '../domain/profile-attribute';
import {
  OPTIONAL_PROFILE_ATTRIBUTES,
  REQUIRED_PROFILE_ATTRIBUTES,
} from '../domain/profile-attribute';
import { loadGrantsSnapshot } from './supabase-data-grant.queries';

export class SupabaseDataGrantRepository implements DataGrantRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async replaceOptionalGrants(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    checklist: GrantChecklist,
    now: Date,
  ): Promise<DataGrantsSnapshot> {
    const desiredAttrs = new Set<OptionalProfileAttribute>(checklist.optionalProfileAttributes);
    const desiredClasses = new Set<DataGrantClass>(checklist.optionalClassGrants);
    const nowIso = now.toISOString();

    const [profileResult, classResult] = await Promise.all([
      this.client
        .from('profile_attribute_grants')
        .select('id, attribute, deleted_at')
        .eq('client_user_id', clientUserId)
        .eq('gym_org_id', gymOrgId)
        .in('attribute', [...OPTIONAL_PROFILE_ATTRIBUTES]),
      this.client
        .from('data_grants')
        .select('id, class, deleted_at')
        .eq('client_user_id', clientUserId)
        .eq('gym_org_id', gymOrgId),
    ]);

    if (profileResult.error !== null || classResult.error !== null) {
      throw new TransientDatabaseFailureError('Unable to read grants before update', {
        cause: profileResult.error ?? classResult.error,
      });
    }

    for (const row of profileResult.data ?? []) {
      const attr = row.attribute as OptionalProfileAttribute;
      const isLive = row.deleted_at === null;
      const wanted = desiredAttrs.has(attr);

      if (isLive && !wanted) {
        const { error } = await this.client
          .from('profile_attribute_grants')
          .update({ deleted_at: nowIso })
          .eq('id', row.id)
          .is('deleted_at', null);
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to revoke profile attribute grant', {
            cause: error,
          });
        }
      } else if (!isLive && wanted) {
        const { error } = await this.client
          .from('profile_attribute_grants')
          .update({ deleted_at: null })
          .eq('id', row.id);
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to restore profile attribute grant', {
            cause: error,
          });
        }
        desiredAttrs.delete(attr);
      } else if (isLive && wanted) {
        desiredAttrs.delete(attr);
      }
    }

    for (const attr of desiredAttrs) {
      const { error } = await this.client.from('profile_attribute_grants').insert({
        client_user_id: clientUserId,
        gym_org_id: gymOrgId,
        attribute: attr,
      });
      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to grant profile attribute', {
          cause: error,
        });
      }
    }

    for (const row of classResult.data ?? []) {
      const cls = row.class as DataGrantClass;
      const isLive = row.deleted_at === null;
      const wanted = desiredClasses.has(cls);

      if (isLive && !wanted) {
        const { error } = await this.client
          .from('data_grants')
          .update({ deleted_at: nowIso })
          .eq('id', row.id)
          .is('deleted_at', null);
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to revoke class grant', {
            cause: error,
          });
        }
      } else if (!isLive && wanted) {
        const { error } = await this.client
          .from('data_grants')
          .update({ deleted_at: null })
          .eq('id', row.id);
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to restore class grant', {
            cause: error,
          });
        }
        desiredClasses.delete(cls);
      } else if (isLive && wanted) {
        desiredClasses.delete(cls);
      }
    }

    for (const cls of desiredClasses) {
      const { error } = await this.client.from('data_grants').insert({
        client_user_id: clientUserId,
        gym_org_id: gymOrgId,
        class: cls,
      });
      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to grant class', { cause: error });
      }
    }

    // Ensure required attributes remain live (defense in depth).
    for (const attr of REQUIRED_PROFILE_ATTRIBUTES) {
      const { data: existing, error: readError } = await this.client
        .from('profile_attribute_grants')
        .select('id, deleted_at')
        .eq('client_user_id', clientUserId)
        .eq('gym_org_id', gymOrgId)
        .eq('attribute', attr)
        .maybeSingle();

      if (readError !== null) {
        throw new TransientDatabaseFailureError('Unable to verify required profile grant', {
          cause: readError,
        });
      }

      if (existing === null) {
        const { error } = await this.client.from('profile_attribute_grants').insert({
          client_user_id: clientUserId,
          gym_org_id: gymOrgId,
          attribute: attr,
        });
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to ensure required profile grant', {
            cause: error,
          });
        }
      } else if (existing.deleted_at !== null) {
        const { error } = await this.client
          .from('profile_attribute_grants')
          .update({ deleted_at: null })
          .eq('id', existing.id);
        if (error !== null) {
          throw new TransientDatabaseFailureError('Unable to restore required profile grant', {
            cause: error,
          });
        }
      }
    }

    return loadGrantsSnapshot(this.client, clientUserId, gymOrgId);
  }
}
