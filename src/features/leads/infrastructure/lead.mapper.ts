import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { Lead } from '../domain/lead.entity';
import { toLeadId } from '../domain/lead-id';
import { LeadEmail } from '../domain/lead-email.value-object';
import { LeadName } from '../domain/lead-name.value-object';
import { LeadPhone } from '../domain/lead-phone.value-object';
import { isLeadStatus } from '../domain/lead-status';
import type { LeadSummary } from '../domain/lead.queries';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export function toLead(row: LeadRow): Lead {
  try {
    if (!isLeadStatus(row.status)) {
      throw new Error('Stored lead status is invalid');
    }
    return Lead.reconstitute({
      id: toLeadId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      name: LeadName.create(row.name),
      phone: LeadPhone.create(row.phone),
      email: row.email === null ? null : LeadEmail.create(row.email),
      source: row.source,
      status: row.status,
      interest: row.interest,
      notes: row.notes,
      followUpDate: row.follow_up_date,
      convertedMembershipInviteId: row.converted_membership_invite_id,
      createdBy: toUserId(row.created_by),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored lead is invalid', { cause: error });
  }
}

export function toLeadSummary(row: LeadRow): LeadSummary {
  if (!isLeadStatus(row.status)) {
    throw new DataIntegrityError('Stored lead status is invalid');
  }
  return {
    id: toLeadId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    status: row.status,
    interest: row.interest,
    notes: row.notes,
    followUpDate: row.follow_up_date,
    convertedMembershipInviteId: row.converted_membership_invite_id,
    createdBy: row.created_by,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toLeadInsert(lead: Lead): Database['public']['Tables']['leads']['Insert'] {
  return {
    id: lead.id,
    gym_org_id: lead.gymOrgId,
    name: lead.name.value,
    phone: lead.phone.value,
    email: lead.email?.value ?? null,
    source: lead.source,
    status: lead.status,
    interest: lead.interest,
    notes: lead.notes,
    follow_up_date: lead.followUpDate,
    converted_membership_invite_id: lead.convertedMembershipInviteId,
    created_by: lead.createdBy,
    deleted_at: lead.deletedAt?.toISOString() ?? null,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
  };
}

export function toLeadUpdate(lead: Lead): Database['public']['Tables']['leads']['Update'] {
  return {
    name: lead.name.value,
    phone: lead.phone.value,
    email: lead.email?.value ?? null,
    source: lead.source,
    status: lead.status,
    interest: lead.interest,
    notes: lead.notes,
    follow_up_date: lead.followUpDate,
    converted_membership_invite_id: lead.convertedMembershipInviteId,
    deleted_at: lead.deletedAt?.toISOString() ?? null,
    updated_at: lead.updatedAt.toISOString(),
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
