import type { Lead } from '../domain/lead.entity';
import type { LeadSummary } from '../domain/lead.queries';
import type { LeadStatus } from '../domain/lead-status';

export interface LeadDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly name: string;
  readonly phone: string;
  readonly source: string | null;
  readonly status: LeadStatus;
  readonly interest: string | null;
  readonly notes: string | null;
  readonly followUpDate: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadWarningDto {
  readonly code: 'DUPLICATE_OPEN_LEAD_PHONE';
  readonly existingLeadIds: readonly string[];
}

export interface LeadMutationResult {
  readonly lead: LeadDto;
  readonly warnings: readonly LeadWarningDto[];
}

export function toLeadDto(lead: Lead): LeadDto {
  return {
    id: lead.id,
    gymOrgId: lead.gymOrgId,
    name: lead.name.value,
    phone: lead.phone.value,
    source: lead.source,
    status: lead.status,
    interest: lead.interest,
    notes: lead.notes,
    followUpDate: lead.followUpDate,
    createdBy: lead.createdBy,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function toLeadDtoFromSummary(summary: LeadSummary): LeadDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    name: summary.name,
    phone: summary.phone,
    source: summary.source,
    status: summary.status,
    interest: summary.interest,
    notes: summary.notes,
    followUpDate: summary.followUpDate,
    createdBy: summary.createdBy,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export function duplicatePhoneWarning(existingLeadIds: readonly string[]): LeadWarningDto {
  return {
    code: 'DUPLICATE_OPEN_LEAD_PHONE',
    existingLeadIds,
  };
}
