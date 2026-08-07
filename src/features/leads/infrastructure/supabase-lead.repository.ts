import type { SupabaseClient } from '@supabase/supabase-js';

import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Lead } from '../domain/lead.entity';
import { toLeadId, type LeadId } from '../domain/lead-id';
import type { LeadPhone } from '../domain/lead-phone.value-object';
import { OPEN_LEAD_STATUSES } from '../domain/lead-status';
import type { LeadRepository } from '../domain/lead.repository';
import { toLead, toLeadInsert, toLeadUpdate } from './lead.mapper';

export class SupabaseLeadRepository implements LeadRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(gymOrgId: GymOrgId, leadId: LeadId): Promise<Lead | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read lead', { cause: error });
    }
    if (data === null) {
      return null;
    }

    return toLead(data);
  }

  async save(lead: Lead): Promise<void> {
    const { data: existing, error: readError } = await this.client
      .from('leads')
      .select('id')
      .eq('id', lead.id)
      .eq('gym_org_id', lead.gymOrgId)
      .maybeSingle();

    if (readError !== null) {
      throw new TransientDatabaseFailureError('Unable to read lead before save', {
        cause: readError,
      });
    }

    if (existing === null) {
      const { error } = await this.client.from('leads').insert(toLeadInsert(lead));
      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to create lead', { cause: error });
      }
      return;
    }

    const { data, error } = await this.client
      .from('leads')
      .update(toLeadUpdate(lead))
      .eq('id', lead.id)
      .eq('gym_org_id', lead.gymOrgId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to save lead', { cause: error });
    }
    if (data === null) {
      throw new NotFoundError('Lead not found');
    }
  }

  async findOpenLeadIdsByPhone(
    gymOrgId: GymOrgId,
    phone: LeadPhone,
    excludeLeadId?: LeadId,
  ): Promise<readonly LeadId[]> {
    let query = this.client
      .from('leads')
      .select('id')
      .eq('gym_org_id', gymOrgId)
      .eq('phone', phone.value)
      .in('status', [...OPEN_LEAD_STATUSES])
      .is('deleted_at', null);

    if (excludeLeadId !== undefined) {
      query = query.neq('id', excludeLeadId);
    }

    const { data, error } = await query;

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to look up open leads by phone', {
        cause: error,
      });
    }

    return (data ?? []).map((row) => toLeadId(row.id));
  }
}
