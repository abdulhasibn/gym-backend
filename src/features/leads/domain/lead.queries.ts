import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { LeadId } from './lead-id';
import type { LeadStatus } from './lead-status';

export interface LeadSummary {
  readonly id: LeadId;
  readonly gymOrgId: GymOrgId;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly source: string | null;
  readonly status: LeadStatus;
  readonly interest: string | null;
  readonly notes: string | null;
  readonly followUpDate: string | null;
  readonly convertedMembershipInviteId: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListLeadsCriteria {
  readonly gymOrgId: GymOrgId;
  readonly status?: LeadStatus;
}

export interface ListDueFollowUpsCriteria {
  readonly gymOrgId: GymOrgId;
  readonly onOrBefore: string;
}

export interface LeadQueries {
  get(gymOrgId: GymOrgId, leadId: LeadId): Promise<LeadSummary | null>;
  list(criteria: ListLeadsCriteria, page: Pagination): Promise<Page<LeadSummary>>;
  listDueFollowUps(
    criteria: ListDueFollowUpsCriteria,
    page: Pagination,
  ): Promise<Page<LeadSummary>>;
}
