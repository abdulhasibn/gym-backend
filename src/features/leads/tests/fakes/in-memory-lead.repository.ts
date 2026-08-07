import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { Lead } from '../../domain/lead.entity';
import type { LeadId } from '../../domain/lead-id';
import type { LeadPhone } from '../../domain/lead-phone.value-object';
import { isOpenLeadStatus } from '../../domain/lead-status';
import type { LeadRepository } from '../../domain/lead.repository';
import type {
  LeadQueries,
  LeadSummary,
  ListDueFollowUpsCriteria,
  ListLeadsCriteria,
} from '../../domain/lead.queries';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';

function toSummary(lead: Lead): LeadSummary {
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

export class InMemoryLeadStore implements LeadRepository, LeadQueries {
  private readonly byId = new Map<string, Lead>();

  async findById(gymOrgId: GymOrgId, leadId: LeadId): Promise<Lead | null> {
    const lead = this.byId.get(leadId);
    if (lead === undefined || lead.gymOrgId !== gymOrgId || lead.isDeleted) {
      return null;
    }
    return lead;
  }

  async save(lead: Lead): Promise<void> {
    this.byId.set(lead.id, lead);
  }

  async findOpenLeadIdsByPhone(
    gymOrgId: GymOrgId,
    phone: LeadPhone,
    excludeLeadId?: LeadId,
  ): Promise<readonly LeadId[]> {
    return [...this.byId.values()]
      .filter(
        (lead) =>
          lead.gymOrgId === gymOrgId &&
          !lead.isDeleted &&
          isOpenLeadStatus(lead.status) &&
          lead.phone.value === phone.value &&
          lead.id !== excludeLeadId,
      )
      .map((lead) => lead.id);
  }

  async get(gymOrgId: GymOrgId, leadId: LeadId): Promise<LeadSummary | null> {
    const lead = await this.findById(gymOrgId, leadId);
    return lead === null ? null : toSummary(lead);
  }

  async list(criteria: ListLeadsCriteria, page: Pagination): Promise<Page<LeadSummary>> {
    const items = [...this.byId.values()]
      .filter(
        (lead) =>
          lead.gymOrgId === criteria.gymOrgId &&
          !lead.isDeleted &&
          (criteria.status === undefined || lead.status === criteria.status),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toSummary);

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }

  async listDueFollowUps(
    criteria: ListDueFollowUpsCriteria,
    page: Pagination,
  ): Promise<Page<LeadSummary>> {
    const items = [...this.byId.values()]
      .filter(
        (lead) =>
          lead.gymOrgId === criteria.gymOrgId &&
          !lead.isDeleted &&
          isOpenLeadStatus(lead.status) &&
          lead.followUpDate !== null &&
          lead.followUpDate <= criteria.onOrBefore,
      )
      .sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''))
      .map(toSummary);

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}
