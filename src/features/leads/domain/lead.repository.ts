import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Lead } from './lead.entity';
import type { LeadId } from './lead-id';
import type { LeadPhone } from './lead-phone.value-object';

export interface LeadRepository {
  findById(gymOrgId: GymOrgId, leadId: LeadId): Promise<Lead | null>;
  save(lead: Lead): Promise<void>;
  findOpenLeadIdsByPhone(
    gymOrgId: GymOrgId,
    phone: LeadPhone,
    excludeLeadId?: LeadId,
  ): Promise<readonly LeadId[]>;
}
