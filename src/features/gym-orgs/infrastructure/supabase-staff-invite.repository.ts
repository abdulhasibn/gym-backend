import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GymOrgId } from '../domain/gym-org-id';
import type { StaffInvite } from '../domain/staff-invite.entity';
import type { StaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteRepository } from '../domain/staff-invite.repository';
import { toStaffInvite } from './staff-invite.mapper';

export class SupabaseStaffInviteRepository implements StaffInviteRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: StaffInviteId): Promise<StaffInvite | null> {
    const { data, error } = await this.client
      .from('staff_invites')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read staff invite', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return toStaffInvite(data);
  }

  async save(invite: StaffInvite): Promise<void> {
    const { data: existing, error: existingError } = await this.client
      .from('staff_invites')
      .select('id')
      .eq('id', invite.id)
      .maybeSingle();

    if (existingError !== null) {
      throw new TransientDatabaseFailureError('Unable to read staff invite before save', {
        cause: existingError,
      });
    }

    if (existing === null) {
      const { error } = await this.client.from('staff_invites').insert({
        id: invite.id,
        gym_org_id: invite.gymOrgId,
        invited_user_id: invite.invitedUserId,
        target_role: invite.targetRole,
        status: invite.status,
        expires_at: invite.expiresAt?.toISOString() ?? null,
        created_by: invite.createdBy,
        accepted_at: invite.acceptedAt?.toISOString() ?? null,
        created_at: invite.createdAt.toISOString(),
        updated_at: invite.updatedAt.toISOString(),
      });

      if (error !== null) {
        if (error.code === '23505') {
          throw new UniqueViolationError('A pending staff invite already exists for this user');
        }
        throw new TransientDatabaseFailureError('Unable to create staff invite', {
          cause: error,
        });
      }
      return;
    }

    const { data, error } = await this.client
      .from('staff_invites')
      .update({
        status: invite.status,
        expires_at: invite.expiresAt?.toISOString() ?? null,
        accepted_at: invite.acceptedAt?.toISOString() ?? null,
        updated_at: invite.updatedAt.toISOString(),
      })
      .eq('id', invite.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      if (error.code === '23505') {
        throw new UniqueViolationError('A pending staff invite already exists for this user');
      }
      throw new TransientDatabaseFailureError('Unable to update staff invite', {
        cause: error,
      });
    }
    if (data === null) {
      throw new NotFoundError('Staff invite not found');
    }
  }

  async countPendingAdminInvites(gymOrgId: GymOrgId): Promise<number> {
    const { count, error } = await this.client
      .from('staff_invites')
      .select('id', { count: 'exact', head: true })
      .eq('gym_org_id', gymOrgId)
      .eq('target_role', 'ADMIN')
      .eq('status', 'PENDING')
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to count pending admin invites', {
        cause: error,
      });
    }

    return count ?? 0;
  }

  async hasLiveStaffAffiliation(userId: UserId, gymOrgId: GymOrgId): Promise<boolean> {
    const [adminResult, trainerResult] = await Promise.all([
      this.client
        .from('gym_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('gym_org_id', gymOrgId)
        .is('deleted_at', null)
        .maybeSingle(),
      this.client
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('gym_org_id', gymOrgId)
        .is('deleted_at', null)
        .maybeSingle(),
    ]);

    if (adminResult.error !== null || trainerResult.error !== null) {
      throw new TransientDatabaseFailureError('Unable to read staff affiliation', {
        cause: adminResult.error ?? trainerResult.error,
      });
    }

    return adminResult.data !== null || trainerResult.data !== null;
  }

  async countLiveAdmins(gymOrgId: GymOrgId): Promise<number> {
    const { count, error } = await this.client
      .from('gym_admins')
      .select('id', { count: 'exact', head: true })
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to count gym admins', {
        cause: error,
      });
    }

    return count ?? 0;
  }

  async accept(inviteId: StaffInviteId, actorUserId: UserId): Promise<StaffInvite> {
    const { data, error } = await this.client.rpc('accept_staff_invite', {
      p_invite_id: inviteId,
      p_user_id: actorUserId,
    });

    if (error !== null) {
      if (error.code === 'P0001') {
        throw new ConflictError(error.message || 'Unable to accept staff invite');
      }
      if (error.code === '23505') {
        throw new UniqueViolationError('Staff affiliation already exists for this gym');
      }
      throw new TransientDatabaseFailureError('Unable to accept staff invite', {
        cause: error,
      });
    }
    if (data === null) {
      throw new TransientDatabaseFailureError('Staff invite accept returned no result');
    }

    return toStaffInvite(data);
  }
}
