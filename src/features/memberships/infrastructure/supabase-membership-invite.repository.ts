import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GrantChecklist } from '../domain/grant-checklist';
import type { MembershipInvite } from '../domain/membership-invite.entity';
import type { MembershipInviteId } from '../domain/membership-invite-id';
import type { MembershipInviteRepository } from '../domain/membership-invite.repository';
import { toMembershipInvite } from './membership-invite.mapper';

export class SupabaseMembershipInviteRepository implements MembershipInviteRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(inviteId: MembershipInviteId): Promise<MembershipInvite | null> {
    const { data, error } = await this.client
      .from('membership_invites')
      .select('*')
      .eq('id', inviteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read membership invite', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return toMembershipInvite(data);
  }

  async save(invite: MembershipInvite): Promise<void> {
    const { data: existing, error: existingError } = await this.client
      .from('membership_invites')
      .select('id')
      .eq('id', invite.id)
      .maybeSingle();

    if (existingError !== null) {
      throw new TransientDatabaseFailureError('Unable to read membership invite before save', {
        cause: existingError,
      });
    }

    if (existing === null) {
      const { error } = await this.client.from('membership_invites').insert({
        id: invite.id,
        gym_org_id: invite.gymOrgId,
        invited_email: invite.invitedEmail.value,
        invited_user_id: invite.invitedUserId,
        invitee_name: invite.inviteeName.value,
        invitee_phone: invite.inviteePhone?.value ?? null,
        base_plan_id: invite.basePlanId,
        base_payment_status: invite.basePaymentStatus,
        addon_plan_id: invite.addonPlanId,
        addon_payment_status: invite.addonPaymentStatus,
        status: invite.status,
        expires_at: invite.expiresAt?.toISOString() ?? null,
        created_by: invite.createdBy,
        accepted_at: invite.acceptedAt?.toISOString() ?? null,
        accepted_membership_id: invite.acceptedMembershipId,
        deleted_at: invite.deletedAt?.toISOString() ?? null,
        created_at: invite.createdAt.toISOString(),
        updated_at: invite.updatedAt.toISOString(),
      });

      if (error !== null) {
        if (error.code === '23505') {
          throw new UniqueViolationError(
            'A pending membership invite already exists for this email at this gym',
          );
        }
        throw new TransientDatabaseFailureError('Unable to create membership invite', {
          cause: error,
        });
      }
      return;
    }

    const { data, error } = await this.client
      .from('membership_invites')
      .update({
        status: invite.status,
        expires_at: invite.expiresAt?.toISOString() ?? null,
        accepted_at: invite.acceptedAt?.toISOString() ?? null,
        accepted_membership_id: invite.acceptedMembershipId,
        invited_user_id: invite.invitedUserId,
        updated_at: invite.updatedAt.toISOString(),
        deleted_at: invite.deletedAt?.toISOString() ?? null,
      })
      .eq('id', invite.id)
      .eq('gym_org_id', invite.gymOrgId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      if (error.code === '23505') {
        throw new UniqueViolationError(
          'A pending membership invite already exists for this email at this gym',
        );
      }
      throw new TransientDatabaseFailureError('Unable to update membership invite', {
        cause: error,
      });
    }
    if (data === null) {
      throw new NotFoundError('Membership invite not found');
    }
  }

  async accept(
    inviteId: MembershipInviteId,
    actorUserId: UserId,
    checklist: GrantChecklist,
  ): Promise<MembershipInvite> {
    const { data, error } = await this.client.rpc('accept_membership_invite', {
      p_invite_id: inviteId,
      p_user_id: actorUserId,
      p_optional_profile_attributes: [...checklist.optionalProfileAttributes],
      p_optional_class_grants: [...checklist.optionalClassGrants],
    });

    if (error !== null) {
      if (error.code === 'P0001') {
        throw new ConflictError(error.message || 'Unable to accept membership invite');
      }
      if (error.code === '23505') {
        throw new UniqueViolationError('Client already has an ACTIVE membership');
      }
      throw new TransientDatabaseFailureError('Unable to accept membership invite', {
        cause: error,
      });
    }
    if (data === null) {
      throw new TransientDatabaseFailureError('Membership invite accept returned no result');
    }

    return toMembershipInvite(data);
  }
}
